import { Router, Request, Response } from "express"
import pool from "../db/pool.js"

const router = Router()

// GET /categories
// Returns all categories. Parent categories have parent_id = null.
// The frontend can build the tree from this flat list.
router.get("/", async (_req: Request, res: Response) => {
  const result = await pool.query(`
    SELECT id, name, slug, parent_id
    FROM categories
    ORDER BY parent_id NULLS FIRST, name
  `)

  res.json(result.rows)
})

export default router
