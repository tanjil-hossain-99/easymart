import { Request, Response, Router } from "express";
import { HttpStatus } from "../constants.js";
import pool from "../db/pool.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();

// Every route in this file requires a logged-in admin
router.use(requireAuth, requireAdmin);

// GET /admin/ping — temporary, just to test the guard
router.get("/ping", (req: Request, res: Response) => {
  res.json({ ok: true, admin: req.user });
});

// ─── PATCH /admin/products/:id ───────────────────────────────────────────────
// Update editable product fields. Currently supports: discount (0–100).
router.patch("/products/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { discount } = req.body;

  if (discount === undefined) {
    res.status(HttpStatus.BadRequest).json({ error: "Nothing to update" });
    return;
  }

  const discountNum = Number(discount);
  if (!Number.isFinite(discountNum) || discountNum < 0 || discountNum > 100) {
    res.status(HttpStatus.BadRequest).json({ error: "discount must be a number between 0 and 100" });
    return;
  }

  const result = await pool.query(
    `UPDATE products SET discount = $1 WHERE id = $2 RETURNING id, title, price, discount`,
    [discountNum, req.params.id],
  );

  if (result.rows.length === 0) {
    res.status(HttpStatus.NotFound).json({ error: "Product not found" });
    return;
  }

  res.json(result.rows[0]);
});

// ─── POST /admin/products/:id/feature ────────────────────────────────────────
// Mark a product as a featured deal until a given datetime.
// Body: { featured_until: "2024-12-31T23:59:59Z" }
router.post("/products/:id/feature", async (req: Request<{ id: string }>, res: Response) => {
  const { featured_until } = req.body;

  if (!featured_until || isNaN(Date.parse(featured_until))) {
    res.status(HttpStatus.BadRequest).json({ error: "featured_until must be a valid ISO datetime" });
    return;
  }

  if (new Date(featured_until) <= new Date()) {
    res.status(HttpStatus.BadRequest).json({ error: "featured_until must be in the future" });
    return;
  }

  const result = await pool.query(
    `UPDATE products SET featured_until = $1 WHERE id = $2 RETURNING id, title, featured_until`,
    [featured_until, req.params.id],
  );

  if (result.rows.length === 0) {
    res.status(HttpStatus.NotFound).json({ error: "Product not found" });
    return;
  }

  res.json(result.rows[0]);
});

// ─── DELETE /admin/products/:id/feature ──────────────────────────────────────
// Remove a product from featured deals immediately.
router.delete("/products/:id/feature", async (req: Request<{ id: string }>, res: Response) => {
  const result = await pool.query(
    `UPDATE products SET featured_until = NULL WHERE id = $1 RETURNING id`,
    [req.params.id],
  );

  if (result.rows.length === 0) {
    res.status(HttpStatus.NotFound).json({ error: "Product not found" });
    return;
  }

  res.status(HttpStatus.NoContent).send();
});

export default router;
