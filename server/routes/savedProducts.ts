import { Request, Response, Router } from "express";
import { HttpStatus } from "../constants.js";
import pool from "../db/pool.js";
import { FINAL_PRICE_SQL } from "../db/sql.js";
import { requireAuth } from "../middleware/auth.js";
import type { IdRow, ProductListRow } from "../types.js";

const router = Router();
router.use(requireAuth);

type SavedProductRow = ProductListRow & { saved_at: Date };

// ─── GET /saved ───────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const result = await pool.query<SavedProductRow>(
    `SELECT
       p.id,
       p.title,
       p.price,
       p.discount,
       ${FINAL_PRICE_SQL} AS final_price,
       p.category_id,
       p.merchant_id,
       m.name AS merchant_name,
       p.created_at,
       pi.url AS primary_image,
       sp.created_at AS saved_at
     FROM saved_products sp
     JOIN products p ON p.id = sp.product_id
     JOIN merchants m ON m.id = p.merchant_id
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
     WHERE sp.user_id = $1
     ORDER BY sp.created_at DESC`,
    [req.user!.id],
  );
  res.json({ data: result.rows });
});

// ─── POST /saved ──────────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const productId = req.body?.product_id;
  if (!productId) {
    res.status(HttpStatus.BadRequest).json({ error: "product_id is required" });
    return;
  }

  const product = await pool.query<IdRow>(
    `SELECT id FROM products WHERE id = $1 AND is_active = true`,
    [productId],
  );
  if (product.rows.length === 0) {
    res.status(HttpStatus.NotFound).json({ error: "Product not found" });
    return;
  }

  const result = await pool.query<IdRow>(
    `INSERT INTO saved_products (user_id, product_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, product_id) DO NOTHING
     RETURNING id`,
    [req.user!.id, productId],
  );

  res.status(HttpStatus.Created).json({ saved: true, id: result.rows[0]?.id ?? null });
});

// ─── DELETE /saved/:productId ─────────────────────────────────────────────────
router.delete("/:productId", async (req: Request<{ productId: string }>, res: Response) => {
  const result = await pool.query(
    `DELETE FROM saved_products WHERE user_id = $1 AND product_id = $2`,
    [req.user!.id, req.params.productId],
  );

  if (result.rowCount === 0) {
    res.status(HttpStatus.NotFound).json({ error: "Saved product not found" });
    return;
  }
  res.status(HttpStatus.NoContent).end();
});

export default router;
