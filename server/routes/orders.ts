import { Request, Response, Router } from "express";
import { stripe } from "../config/stripe.js";
import { HttpStatus, OrderStatus } from "../constants.js";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import type { OrderItemDetailRow, OrderRow, OrderSummaryRow } from "../types.js";

const router = Router();

router.use(requireAuth);

// ─── GET /orders ──────────────────────────────────────────────────────────────
// The logged-in user's orders, newest first. Summary only — the detail page
// loads items via GET /orders/:id.
router.get("/", async (req: Request, res: Response) => {
  // One query with GROUP BY instead of "fetch orders, then count items per order"
  // (that would be N+1 queries: 1 for the list + 1 per order).
  const result = await pool.query<OrderSummaryRow>(
    `SELECT o.id, o.status, o.total_amount, o.created_at,
            COALESCE(SUM(oi.quantity), 0)::INTEGER AS item_count,
            (SELECT pi.url
             FROM order_items oi2
             JOIN products p2 ON p2.id = oi2.product_id
             LEFT JOIN product_images pi ON pi.product_id = p2.id AND pi.is_primary = true
             WHERE oi2.order_id = o.id
             ORDER BY oi2.created_at
             LIMIT 1) AS preview_image,
            (SELECT p2.title
             FROM order_items oi2
             JOIN products p2 ON p2.id = oi2.product_id
             WHERE oi2.order_id = o.id
             ORDER BY oi2.created_at
             LIMIT 1) AS first_title
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = $1
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [req.user!.id],
  );
  res.json(result.rows);
});

// ─── GET /orders/:id ──────────────────────────────────────────────────────────
// One order with its items. While the order is still pending, also returns the
// Stripe client_secret so the payment page works even after a page refresh.
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  // user_id in the WHERE is the ownership check — other users get a 404
  const orderResult = await pool.query<OrderRow>(
    `SELECT id, status, total_amount, stripe_payment_intent_id, created_at
     FROM orders
     WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user!.id],
  );
  const order = orderResult.rows[0];
  if (!order) {
    res.status(HttpStatus.NotFound).json({ error: "Order not found" });
    return;
  }

  const items = await pool.query<OrderItemDetailRow>(
    `SELECT oi.id, oi.product_id, p.title, pi.url AS primary_image, oi.quantity, oi.price_at_purchase,
            oi.price_at_purchase * oi.quantity AS line_total
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
     WHERE oi.order_id = $1
     ORDER BY oi.created_at`,
    [order.id],
  );

  // We don't store the client_secret — it's a credential for paying this order,
  // so we fetch it from Stripe only when it's actually needed (unpaid orders).
  let clientSecret: string | null = null;
  if (order.status === OrderStatus.Pending && order.stripe_payment_intent_id) {
    const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
    clientSecret = paymentIntent.client_secret;
  }

  res.json({
    id: order.id,
    status: order.status,
    total_amount: order.total_amount,
    created_at: order.created_at,
    items: items.rows,
    clientSecret,
  });
});

// ─── PATCH /orders/:id/address ────────────────────────────────────────────────
// Save the shipping address to the order before payment.
router.patch("/:id/address", async (req: Request<{ id: string }>, res: Response) => {
  const { full_name, line1, line2, city, state, postal_code, country } = req.body;

  if (!full_name || !line1 || !city || !state || !postal_code) {
    res.status(HttpStatus.BadRequest).json({ error: "full_name, line1, city, state and postal_code are required" });
    return;
  }

  const result = await pool.query(
    `UPDATE orders
     SET shipping_name = $1, shipping_line1 = $2, shipping_line2 = $3,
         shipping_city = $4, shipping_state = $5, shipping_postal_code = $6,
         shipping_country = $7
     WHERE id = $8 AND user_id = $9 AND status = 'pending'
     RETURNING id`,
    [full_name, line1, line2 ?? null, city, state, postal_code, country ?? "Bangladesh", req.params.id, req.user!.id],
  );

  if (result.rows.length === 0) {
    res.status(HttpStatus.NotFound).json({ error: "Order not found or already paid" });
    return;
  }

  res.status(HttpStatus.NoContent).send();
});

export default router;
