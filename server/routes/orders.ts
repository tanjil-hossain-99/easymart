import { Request, Response, Router } from "express";
import { stripe } from "../config/stripe.js";
import { HttpStatus, OrderStatus } from "../constants.js";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import type { OrderItemDetailRow, OrderRow } from "../types.js";

const router = Router();

router.use(requireAuth);

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

export default router;
