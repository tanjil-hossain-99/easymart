import { Router, Request, Response } from "express"
import pool from "../db/pool.js"

const router = Router()

// ─── GET /products ────────────────────────────────────────────────────────────
// Supports:
//   ?category_id=uuid       filter by category
//   ?min_price=10           filter by minimum price
//   ?max_price=500          filter by maximum price
//   ?has_discount=true      only products with discount > 0
//   ?sort=price_asc         sort options: price_asc, price_desc, newest
//   ?page=1                 page number (offset pagination — we'll replace this in Phase 3)
//   ?limit=20               results per page (max 100)
router.get("/", async (req: Request, res: Response) => {
  const {
    category_id,
    min_price,
    max_price,
    has_discount,
    sort = "newest",
    page = "1",
    limit = "20",
  } = req.query as Record<string, string>

  // Build WHERE clauses dynamically
  // We collect conditions and values separately to use parameterized queries ($1, $2...)
  // This prevents SQL injection — never concatenate user input directly into SQL
  const conditions: string[] = ["p.is_active = true"]
  const values: unknown[] = []

  if (category_id) {
    values.push(category_id)
    conditions.push(`p.category_id = $${values.length}`)
  }

  if (min_price) {
    values.push(Number(min_price))
    conditions.push(`p.price >= $${values.length}`)
  }

  if (max_price) {
    values.push(Number(max_price))
    conditions.push(`p.price <= $${values.length}`)
  }

  if (has_discount === "true") {
    conditions.push(`p.discount > 0`)
  }

  // Sort
  const sortMap: Record<string, string> = {
    price_asc:  "p.price ASC",
    price_desc: "p.price DESC",
    newest:     "p.created_at DESC",
  }
  const orderBy = sortMap[sort] ?? "p.created_at DESC"

  // Pagination — OFFSET based (intentionally naive for now)
  // In Phase 3 we will observe how slow this gets on large offsets
  const pageNum  = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset   = (pageNum - 1) * limitNum

  const where = conditions.join(" AND ")

  // Main query — join primary image only
  const sql = `
    SELECT
      p.id,
      p.title,
      p.price,
      p.discount,
      p.category_id,
      p.merchant_id,
      p.created_at,
      pi.url AS primary_image
    FROM products p
    LEFT JOIN product_images pi
      ON pi.product_id = p.id AND pi.is_primary = true
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT ${limitNum} OFFSET ${offset}
  `

  // Count query for pagination metadata
  const countSql = `
    SELECT COUNT(*) AS total
    FROM products p
    WHERE ${where}
  `

  const [products, countResult] = await Promise.all([
    pool.query(sql, values),
    pool.query(countSql, values),
  ])

  const total = parseInt(countResult.rows[0].total)

  res.json({
    data: products.rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  })
})

// ─── GET /products/:id ────────────────────────────────────────────────────────
// Returns a single product with:
//   - all images
//   - all variants
//   - merchant info
//   - current inventory
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params

  // All 4 queries run in parallel — no reason to wait for one before starting the next
  const [productResult, imagesResult, variantsResult, inventoryResult] =
    await Promise.all([
      pool.query(
        `SELECT
          p.*,
          m.name   AS merchant_name,
          m.url    AS merchant_url,
          m.logo_url AS merchant_logo,
          c.name   AS category_name,
          c.slug   AS category_slug
        FROM products p
        JOIN merchants m ON m.id = p.merchant_id
        JOIN categories c ON c.id = p.category_id
        WHERE p.id = $1 AND p.is_active = true`,
        [id]
      ),
      pool.query(
        `SELECT id, url, is_primary FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC`,
        [id]
      ),
      pool.query(
        `SELECT id, type, value, price_modifier FROM product_variants WHERE product_id = $1`,
        [id]
      ),
      pool.query(
        `SELECT variant_id, quantity FROM inventory WHERE product_id = $1`,
        [id]
      ),
    ])

  if (productResult.rows.length === 0) {
    res.status(404).json({ error: "Product not found" })
    return
  }

  const product = productResult.rows[0]

  res.json({
    ...product,
    images:    imagesResult.rows,
    variants:  variantsResult.rows,
    inventory: inventoryResult.rows,
  })
})

export default router
