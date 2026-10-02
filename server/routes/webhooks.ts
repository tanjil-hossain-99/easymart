import express, { Request, Response, Router } from "express";
import type Stripe from "stripe";
import { env } from "../config/env.js";
import { stripe } from "../config/stripe.js";
import { HttpStatus, OrderStatus, PaymentStatus, STRIPE, StripeEvent } from "../constants.js";
import pool from "../db/pool.js";
import { withTransaction } from "../db/transaction.js";
import type { PaidOrderRow } from "../types.js";

const router = Router();

// ─── POST /webhooks/stripe ────────────────────────────────────────────────────
// Stripe calls this (not the browser). It's the ONLY place an order becomes "paid".
//
// express.raw(): the signature is computed over the exact bytes Stripe sent.
// If express.json() parsed and re-serialized the body first, the bytes would differ
// and verification would always fail. That's why server.ts mounts this router
// BEFORE app.use(express.json()).
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    let event: Stripe.Event;
    try {
      // Proves the request really came from Stripe and wasn't modified.
      // Without this, anyone could POST {"type":"payment_intent.succeeded"} and get free orders.
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers[STRIPE.signatureHeader] as string,
        env.stripeWebhookSecret,
      );
    } catch (err) {
      res.status(HttpStatus.BadRequest).json({ error: `Webhook signature failed: ${(err as Error).message}` });
      return;
    }

    switch (event.type) {
      case StripeEvent.PaymentIntentSucceeded:
        await handlePaymentSucceeded(event.data.object);
        break;
      case StripeEvent.PaymentIntentFailed:
        await handlePaymentFailed(event.data.object);
        break;
      default:
        // Stripe sends many event types; ignore the ones we don't care about
        break;
    }

    // 2xx tells Stripe "got it". Any other status (or a crash → 500) makes Stripe
    // retry the same event later — for up to 3 days.
    res.json({ received: true });
  },
);

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  await withTransaction(async (client) => {
    // "AND status = pending" makes this idempotent: Stripe can deliver the same event
    // more than once. The first delivery flips pending → paid; any repeat matches
    // no row and we stop here — so stock is never decremented twice.
    const order = await client.query<PaidOrderRow>(
      `UPDATE orders SET status = $1
       WHERE stripe_payment_intent_id = $2 AND status = $3
       RETURNING id, user_id`,
      [OrderStatus.Paid, paymentIntent.id, OrderStatus.Pending],
    );
    if (order.rows.length === 0) return;
    const { id: orderId, user_id: userId } = order.rows[0];

    await client.query(`UPDATE payments SET status = $1 WHERE stripe_payment_intent_id = $2`, [
      PaymentStatus.Succeeded,
      paymentIntent.id,
    ]);

    // Convert the reservation into a real deduction: subtract from both quantity
    // and reserved together. This is safe to retry (idempotent via the status check
    // above) and the CHECK (quantity >= 0) is a final safety net.
    await client.query(
      `UPDATE inventory inv
       SET quantity = inv.quantity - oi.quantity,
           reserved = GREATEST(inv.reserved - oi.quantity, 0)
       FROM order_items oi
       WHERE oi.order_id = $1
         AND inv.product_id = oi.product_id
         AND inv.variant_id IS NOT DISTINCT FROM oi.variant_id`,
      [orderId],
    );

    // Remove only the items that were bought — if the customer added something new
    // to their cart while paying, it stays.
    await client.query(
      `DELETE FROM cart_items ci
       USING carts c, order_items oi
       WHERE c.user_id = $1
         AND ci.cart_id = c.id
         AND oi.order_id = $2
         AND ci.product_id = oi.product_id
         AND ci.variant_id IS NOT DISTINCT FROM oi.variant_id`,
      [userId, orderId],
    );
  });
}

// A declined card doesn't end the order: the customer can retry with another card
// on the same PaymentIntent. So only the payment attempt is marked failed; the order
// stays pending (and a later success still flips it to paid).
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  await pool.query(`UPDATE payments SET status = $1 WHERE stripe_payment_intent_id = $2`, [
    PaymentStatus.Failed,
    paymentIntent.id,
  ]);
}

export default router;
