import { Request, Response, Router } from "express";
import { HttpStatus } from "../constants.js";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import type { AddressRow } from "../types.js";

const router = Router();
router.use(requireAuth);

// ─── GET /addresses ───────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const result = await pool.query<AddressRow>(
    `SELECT id, full_name, line1, line2, city, state, postal_code, country, is_default, created_at
     FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
    [req.user!.id],
  );
  res.json(result.rows);
});

// ─── POST /addresses ──────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const { full_name, line1, line2, city, state, postal_code, country, is_default } = req.body;

  if (!full_name || !line1 || !city || !state || !postal_code) {
    res.status(HttpStatus.BadRequest).json({ error: "full_name, line1, city, state and postal_code are required" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (is_default) {
      await client.query(`UPDATE addresses SET is_default = false WHERE user_id = $1`, [req.user!.id]);
    }
    const result = await client.query<AddressRow>(
      `INSERT INTO addresses (user_id, full_name, line1, line2, city, state, postal_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, full_name, line1, line2, city, state, postal_code, country, is_default, created_at`,
      [req.user!.id, full_name, line1, line2 ?? null, city, state, postal_code, country ?? "Bangladesh", !!is_default],
    );
    await client.query("COMMIT");
    res.status(HttpStatus.Created).json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ─── PATCH /addresses/:id ─────────────────────────────────────────────────────
router.patch("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { full_name, line1, line2, city, state, postal_code, country, is_default } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (is_default) {
      await client.query(`UPDATE addresses SET is_default = false WHERE user_id = $1`, [req.user!.id]);
    }
    const result = await client.query<AddressRow>(
      `UPDATE addresses
       SET full_name = COALESCE($1, full_name),
           line1     = COALESCE($2, line1),
           line2     = $3,
           city      = COALESCE($4, city),
           state     = COALESCE($5, state),
           postal_code = COALESCE($6, postal_code),
           country   = COALESCE($7, country),
           is_default = COALESCE($8, is_default)
       WHERE id = $9 AND user_id = $10
       RETURNING id, full_name, line1, line2, city, state, postal_code, country, is_default, created_at`,
      [full_name, line1, line2 ?? null, city, state, postal_code, country, is_default ?? null, req.params.id, req.user!.id],
    );
    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(HttpStatus.NotFound).json({ error: "Address not found" });
      return;
    }
    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ─── DELETE /addresses/:id ────────────────────────────────────────────────────
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const result = await pool.query(
    `DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id`,
    [req.params.id, req.user!.id],
  );
  if (result.rows.length === 0) {
    res.status(HttpStatus.NotFound).json({ error: "Address not found" });
    return;
  }
  res.status(HttpStatus.NoContent).send();
});

export default router;
