import { Request, Response, Router } from "express";
import { stripe } from "../config/stripe.js";
import { HttpStatus, OrderStatus, PAYMENT, PaymentStatus } from "../constants.js";
import pool from "../db/pool.js";
import { UNIT_PRICE_SQL } from "../db/sql.js";
import { withTransaction } from "../db/transaction.js";
import { requireAuth } from "../middleware/auth.js";
import type { CheckoutItemRow, IdRow, OrderTotalRow } from "../types.js";
import { HttpError } from "../utils/httpError.js";

const router = Router();

router.use(requireAuth);

// ─── POST /checkout ───────────────────────────────────────────────────────────
// Turns the user's cart into a `pending` order and creates a Stripe PaymentIntent.
// Returns the PaymentIntent's client_secret, which the frontend needs to show
// Stripe's payment form.
//
// NOT done here (on purpose):
//   - decrementing stock and clearing the cart → only after Stripe confirms payment (webhook)
//   - protection against concurrent checkouts / double clicks → Phase 5 (race conditions)
router.post("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // ── 1. Create the order + its items atomically ──────────────────────────────
  const order = await withTransaction(async (client) => {
    const cart = await client.query<CheckoutItemRow>(
      `SELECT ci.product_id, p.title, ci.quantity, inv.quantity AS stock, p.is_active
       FROM carts c
       JOIN cart_items ci ON ci.cart_id = c.id
       JOIN products p ON p.id = ci.product_id
       LEFT JOIN inventory inv
         ON inv.product_id = ci.product_id
        AND inv.variant_id IS NOT DISTINCT FROM ci.variant_id
       WHERE c.user_id = $1`,
      [userId],
    );

    if (cart.rows.length === 0) {
      throw new HttpError(HttpStatus.BadRequest, "Your cart is empty");
    }

    // Check every item and report ALL problems at once, not just the first one
    const problems = cart.rows
      .filter((item) => !item.is_active || (item.stock ?? 0) < item.quantity)
      .map((item) => ({
        product_id: item.product_id,
        title: item.title,
        requested: item.quantity,
        available: item.is_active ? (item.stock ?? 0) : 0,
      }));
    if (problems.length > 0) {
      throw new HttpError(HttpStatus.Conflict, "Some items are no longer available", problems);
    }

    const created = await client.query<IdRow>(
      `INSERT INTO orders (user_id, status, total_amount) VALUES ($1, $2, 0) RETURNING id`,
      [userId, OrderStatus.Pending],
    );
    const orderId = created.rows[0].id;

    // Copy cart → order_items, freezing today's price in price_at_purchase.
    // INSERT ... SELECT does it in one statement, entirely inside Postgres.
    await client.query(
      `INSERT INTO order_items (order_id, product_id, variant_id, quantity, price_at_purchase)
       SELECT $1, ci.product_id, ci.variant_id, ci.quantity, ${UNIT_PRICE_SQL}
       FROM carts c
       JOIN cart_items ci ON ci.cart_id = c.id
       JOIN products p ON p.id = ci.product_id
       LEFT JOIN product_variants v ON v.id = ci.variant_id
       WHERE c.user_id = $2`,
      [orderId, userId],
    );

    // Total is derived from the frozen items, so it can't disagree with them
    const totals = await client.query<OrderTotalRow>(
      `UPDATE orders
       SET total_amount = (
         SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE order_id = $1
       )
       WHERE id = $1
       RETURNING id, total_amount, ROUND(total_amount * $2)::INTEGER AS amount_minor`,
      [orderId, PAYMENT.minorUnitsPerMajor],
    );
    return totals.rows[0];
  });

  // ── 2. Ask Stripe for a PaymentIntent ───────────────────────────────────────
  // Done AFTER the transaction commits: a network call to Stripe can take seconds,
  // and holding a DB transaction open that long blocks other queries.
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create(
      {
        amount: order.amount_minor,
        currency: PAYMENT.currency,
        automatic_payment_methods: { enabled: true }, // card + whatever is enabled in the dashboard
        metadata: { order_id: order.id, user_id: userId }, // lets the webhook find the order
      },
      // If this request is retried (network blip), Stripe returns the same PaymentIntent
      // instead of creating a second one for the same order
      { idempotencyKey: `order-${order.id}` },
    );
  } catch (err) {
    // No way to pay for this order — don't leave it hanging as "pending"
    await pool.query(`UPDATE orders SET status = $1 WHERE id = $2`, [
      OrderStatus.Cancelled,
      order.id,
    ]);
    throw err;
  }

  // ── 3. Link the order to the PaymentIntent ──────────────────────────────────
  await withTransaction(async (client) => {
    await client.query(`UPDATE orders SET stripe_payment_intent_id = $1 WHERE id = $2`, [
      paymentIntent.id,
      order.id,
    ]);
    await client.query(
      `INSERT INTO payments (order_id, stripe_payment_intent_id, amount, currency, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [order.id, paymentIntent.id, order.total_amount, PAYMENT.currency, PaymentStatus.Pending],
    );
  });

  res.status(HttpStatus.Created).json({
    orderId: order.id,
    totalAmount: order.total_amount,
    clientSecret: paymentIntent.client_secret,
  });
});

export default router;
