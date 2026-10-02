import { Request, Response, Router } from "express";
import { CART, HttpStatus } from "../constants.js";
import pool from "../db/pool.js";
import { UNIT_PRICE_SQL } from "../db/sql.js";
import { requireAuth } from "../middleware/auth.js";
import type {
  AddCartItemBody,
  CartItemDetailRow,
  CartItemRow,
  IdRow,
  SubtotalRow,
  UpdateCartItemBody,
} from "../types.js";

const router = Router();

// Every cart route needs a logged-in user — the cart belongs to req.user
router.use(requireAuth);

function isPositiveInt(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

// Each user has exactly one cart (carts.user_id is UNIQUE).
// Create it on first use instead of at signup, so users who never shop don't get empty carts.
async function getOrCreateCartId(userId: string): Promise<string> {
  // ON CONFLICT DO NOTHING: if two requests race here, the UNIQUE constraint
  // makes sure only one cart is created — the other insert silently does nothing.
  await pool.query(
    `INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
  const result = await pool.query<IdRow>(`SELECT id FROM carts WHERE user_id = $1`, [userId]);
  return result.rows[0].id;
}

// ─── GET /cart ────────────────────────────────────────────────────────────────
// Prices are calculated here (not stored in cart_items) so the cart always shows
// today's price. The price is only "frozen" at checkout (order_items.price_at_purchase).
router.get("/", async (req: Request, res: Response) => {
  const cartId = await getOrCreateCartId(req.user!.id);

  const items = await pool.query<CartItemDetailRow>(
    `SELECT
       ci.id,
       ci.product_id,
       ci.variant_id,
       ci.quantity,
       p.title,
       p.price,
       p.discount,
       pi.url AS primary_image,
       v.type  AS variant_type,
       v.value AS variant_value,
       inv.quantity - inv.reserved AS stock,
       ${UNIT_PRICE_SQL} AS unit_price
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     LEFT JOIN product_variants v ON v.id = ci.variant_id
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
     LEFT JOIN inventory inv
       ON inv.product_id = ci.product_id
      AND inv.variant_id IS NOT DISTINCT FROM ci.variant_id
     WHERE ci.cart_id = $1
     ORDER BY ci.created_at`,
    [cartId],
  );

  // Money math in SQL (NUMERIC) — JS numbers are floats: 0.1 + 0.2 = 0.30000000000000004
  const totals = await pool.query<SubtotalRow>(
    `SELECT COALESCE(SUM((${UNIT_PRICE_SQL}) * ci.quantity), 0)::NUMERIC(10, 2) AS subtotal
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     LEFT JOIN product_variants v ON v.id = ci.variant_id
     WHERE ci.cart_id = $1`,
    [cartId],
  );

  res.json({
    id: cartId,
    items: items.rows,
    subtotal: totals.rows[0].subtotal,
  });
});

// ─── POST /cart/items ─────────────────────────────────────────────────────────
// Adding a product that's already in the cart increases its quantity.
router.post("/items", async (req: Request<{}, {}, AddCartItemBody>, res: Response) => {
  const productId = req.body?.product_id;
  const variantId = req.body?.variant_id ?? null;
  const quantity = Number(req.body?.quantity ?? CART.defaultAddQuantity);

  if (!productId || !isPositiveInt(quantity)) {
    res.status(HttpStatus.BadRequest).json({
      error: "product_id and a positive integer quantity are required",
    });
    return;
  }

  // Only active products can be added
  const product = await pool.query<IdRow>(
    `SELECT id FROM products WHERE id = $1 AND is_active = true`,
    [productId],
  );
  if (product.rows.length === 0) {
    res.status(HttpStatus.NotFound).json({ error: "Product not found" });
    return;
  }

  const cartId = await getOrCreateCartId(req.user!.id);

  // "Upsert": insert, or if this product+variant is already in the cart, add to its quantity.
  // One atomic statement — no "SELECT then INSERT or UPDATE" race.
  const result = await pool.query<CartItemRow>(
    `INSERT INTO cart_items (cart_id, product_id, variant_id, quantity)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (cart_id, product_id, variant_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
     RETURNING id, product_id, variant_id, quantity`,
    [cartId, productId, variantId, quantity],
  );

  res.status(HttpStatus.Created).json(result.rows[0]);
});

// ─── PATCH /cart/items/:id ────────────────────────────────────────────────────
// Sets the quantity (not adds)
router.patch(
  "/items/:id",
  async (req: Request<{ id: string }, {}, UpdateCartItemBody>, res: Response) => {
    const quantity = Number(req.body?.quantity);
    if (!isPositiveInt(quantity)) {
      res.status(HttpStatus.BadRequest).json({ error: "quantity must be a positive integer" });
      return;
    }

    // The JOIN on carts.user_id is the ownership check: without it, any logged-in
    // user could change anyone's cart just by guessing an item id.
    const result = await pool.query<CartItemRow>(
      `UPDATE cart_items ci
       SET quantity = $1
       FROM carts c
       WHERE ci.id = $2 AND ci.cart_id = c.id AND c.user_id = $3
       RETURNING ci.id, ci.product_id, ci.variant_id, ci.quantity`,
      [quantity, req.params.id, req.user!.id],
    );

    if (result.rows.length === 0) {
      res.status(HttpStatus.NotFound).json({ error: "Cart item not found" });
      return;
    }
    res.json(result.rows[0]);
  },
);

// ─── DELETE /cart/items/:id ───────────────────────────────────────────────────
router.delete("/items/:id", async (req: Request<{ id: string }>, res: Response) => {
  const result = await pool.query(
    `DELETE FROM cart_items ci
     USING carts c
     WHERE ci.id = $1 AND ci.cart_id = c.id AND c.user_id = $2`,
    [req.params.id, req.user!.id],
  );

  if (result.rowCount === 0) {
    res.status(HttpStatus.NotFound).json({ error: "Cart item not found" });
    return;
  }
  res.status(HttpStatus.NoContent).end();
});

export default router;
