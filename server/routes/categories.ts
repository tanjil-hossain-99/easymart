import { Router, Request, Response } from "express"
import pool from "../db/pool.js"
import type { CategoryRow } from "../types.js"

const router = Router()

// GET /categories
// Returns all categories with one representative product image per category.
router.get("/", async (_req: Request, res: Response) => {
  const result = await pool.query<CategoryRow & { preview_image: string | null }>(`
    SELECT c.id, c.name, c.slug, c.parent_id,
           (
             SELECT pi.url
             FROM products p
             JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
             WHERE p.is_active = true
               AND p.category_id IN (
                 SELECT id FROM categories sub WHERE sub.id = c.id
                 UNION ALL
                 SELECT id FROM categories sub WHERE sub.parent_id = c.id
               )
             LIMIT 1
           ) AS preview_image
    FROM categories c
    ORDER BY c.parent_id NULLS FIRST, c.name
  `)

  res.json(result.rows)
})

export default router
