import { Router, Request, Response } from "express"
import { HttpStatus, PAGINATION, ProductSort } from "../constants.js"
import pool from "../db/pool.js"
import { FINAL_PRICE_SQL, inCategoryTreeSql } from "../db/sql.js"
import type {
  CountRow,
  InventoryRow,
  ProductDetailRow,
  ProductImageRow,
  ProductListRow,
  ProductVariantRow,
} from "../types.js"

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
    sort = ProductSort.Newest,
    page = String(PAGINATION.defaultPage),
    limit = String(PAGINATION.defaultLimit),
  } = req.query as Record<string, string>

  // Build WHERE clauses dynamically
  // We collect conditions and values separately to use parameterized queries ($1, $2...)
  // This prevents SQL injection — never concatenate user input directly into SQL
  const conditions: string[] = ["p.is_active = true"]
  const values: unknown[] = []

  if (category_id) {
    values.push(category_id)
    conditions.push(inCategoryTreeSql(`$${values.length}`))
  }

  // Price filters and sort use the price after discount — the price the customer sees.
  // (Trade-off: idx_products_price can't serve an expression; an expression index could.)
  if (min_price) {
    values.push(Number(min_price))
    conditions.push(`${FINAL_PRICE_SQL} >= $${values.length}`)
  }

  if (max_price) {
    values.push(Number(max_price))
    conditions.push(`${FINAL_PRICE_SQL} <= $${values.length}`)
  }

  if (has_discount === "true") {
    conditions.push(`p.discount > 0`)
  }

  // Sort
  // Record<ProductSort, …> makes TypeScript error if a sort option is added without SQL for it
  // "deals" sort: only actively featured products, expiring soonest first (creates urgency)
  const isDeals = sort === ProductSort.Deals
  if (isDeals) {
    conditions.push(`p.featured_until > NOW()`)
  }

  const sortMap: Record<ProductSort, string> = {
    [ProductSort.PriceAsc]:     `${FINAL_PRICE_SQL} ASC`,
    [ProductSort.PriceDesc]:    `${FINAL_PRICE_SQL} DESC`,
    [ProductSort.Newest]:       "p.created_at DESC",
    [ProductSort.DiscountDesc]: "p.discount DESC",
    [ProductSort.Deals]:        "p.featured_until ASC",
  }
  const orderBy = sortMap[sort as ProductSort] ?? sortMap[ProductSort.Newest]

  // Pagination — OFFSET based (intentionally naive for now)
  // In Phase 3 we will observe how slow this gets on large offsets
  // `|| default` also covers NaN from garbage input like ?page=abc
  const pageNum  = Math.max(1, parseInt(page) || PAGINATION.defaultPage)
  const limitNum = Math.min(PAGINATION.maxLimit, Math.max(1, parseInt(limit) || PAGINATION.defaultLimit))
  const offset   = (pageNum - 1) * limitNum

  const where = conditions.join(" AND ")

  // Main query — join primary image only
  const sql = `
    SELECT
      p.id,
      p.title,
      p.price,
      p.discount,
      ${FINAL_PRICE_SQL} AS final_price,
      p.category_id,
      p.merchant_id,
      m.name AS merchant_name,
      p.created_at,
      pi.url AS primary_image
    FROM products p
    JOIN merchants m ON m.id = p.merchant_id
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
    pool.query<ProductListRow>(sql, values),
    pool.query<CountRow>(countSql, values),
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
      pool.query<ProductDetailRow>(
        `SELECT
          p.*,
          ${FINAL_PRICE_SQL} AS final_price,
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
      pool.query<ProductImageRow>(
        `SELECT id, url, is_primary FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC`,
        [id]
      ),
      pool.query<ProductVariantRow>(
        `SELECT id, type, value, price_modifier FROM product_variants WHERE product_id = $1`,
        [id]
      ),
      pool.query<InventoryRow>(
        `SELECT variant_id, quantity - reserved AS quantity FROM inventory WHERE product_id = $1`,
        [id]
      ),
    ])

  if (productResult.rows.length === 0) {
    res.status(HttpStatus.NotFound).json({ error: "Product not found" })
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
