import "dotenv/config"
import { faker } from "@faker-js/faker"
import pool from "./pool.js"

// ─── Config ────────────────────────────────────────────────────────────────
const COUNT = {
  merchants: 20,
  categories: 50,
  users: 500,
  products: 50_000,
  ordersPerUser: 10,   // ~5000 total orders
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// Inserts rows in chunks and returns all inserted IDs
async function batchInsert(
  table: string,
  columns: string[],
  rows: unknown[][],
  chunkSize = 1000
): Promise<string[]> {
  const ids: string[] = []

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)

    // Build: ($1,$2,$3), ($4,$5,$6), ...
    const placeholders = chunk
      .map((_, rowIdx) =>
        `(${columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(",")})`
      )
      .join(",")

    const values = chunk.flat()
    const sql = `INSERT INTO ${table} (${columns.join(",")}) VALUES ${placeholders} RETURNING id`

    const result = await pool.query(sql, values)
    ids.push(...result.rows.map((r) => r.id))

    process.stdout.write(`\r  ${table}: ${Math.min(i + chunkSize, rows.length)}/${rows.length}`)
  }

  console.log() // newline after progress
  return ids
}

// ─── Seed functions ─────────────────────────────────────────────────────────

async function seedMerchants(): Promise<string[]> {
  console.log("Seeding merchants...")
  const rows = Array.from({ length: COUNT.merchants }, () => [
    faker.company.name(),
    faker.internet.url(),
    faker.company.catchPhrase(),
    faker.image.url(),
    faker.image.url(),
  ])
  return batchInsert("merchants", ["name", "url", "details", "logo_url", "image_url"], rows)
}

async function seedCategories(): Promise<string[]> {
  console.log("Seeding categories...")

  // First 10 are top-level (parent_id = null)
  // department() has a small pool, so pick unique names to avoid slug collisions
  const topLevel = faker.helpers.uniqueArray(faker.commerce.department, 10).map((name) => {
    return [name, faker.helpers.slugify(name).toLowerCase(), null]
  })
  const topIds = await batchInsert("categories", ["name", "slug", "parent_id"], topLevel)

  // Remaining 40 are subcategories, each under a random top-level
  const subLevel = Array.from({ length: COUNT.categories - 10 }, () => {
    const name = `${faker.commerce.productAdjective()} ${faker.commerce.department()}`
    return [name, faker.helpers.slugify(name).toLowerCase() + "-" + faker.string.nanoid(4), faker.helpers.arrayElement(topIds)]
  })
  const subIds = await batchInsert("categories", ["name", "slug", "parent_id"], subLevel)

  return [...topIds, ...subIds]
}

async function seedUsers(): Promise<string[]> {
  console.log("Seeding users...")
  const rows = Array.from({ length: COUNT.users }, () => [
    faker.internet.email(),
    faker.internet.password(), // plain text for seed only — real auth uses bcrypt
    "user",
    faker.image.avatar(),
  ])
  return batchInsert("users", ["email", "password_hash", "role", "avatar_url"], rows)
}

async function seedProducts(merchantIds: string[], categoryIds: string[]): Promise<string[]> {
  console.log("Seeding products (50k — this takes a moment)...")
  const rows = Array.from({ length: COUNT.products }, () => [
    faker.commerce.productName(),
    faker.commerce.productDescription(),
    faker.commerce.price({ min: 5, max: 2000 }),
    faker.number.float({ min: 0, max: 70, fractionDigits: 2 }),
    faker.helpers.arrayElement(merchantIds),
    faker.helpers.arrayElement(categoryIds),
    true,
  ])
  return batchInsert(
    "products",
    ["title", "description", "price", "discount", "merchant_id", "category_id", "is_active"],
    rows
  )
}

async function seedProductImages(productIds: string[]): Promise<void> {
  console.log("Seeding product images...")

  // 1–3 images per product
  const rows: unknown[][] = []
  for (const productId of productIds) {
    const count = faker.number.int({ min: 1, max: 3 })
    for (let i = 0; i < count; i++) {
      rows.push([productId, faker.image.url(), i === 0]) // first image is primary
    }
  }
  await batchInsert("product_images", ["product_id", "url", "is_primary"], rows)
}

async function seedInventory(productIds: string[]): Promise<void> {
  console.log("Seeding inventory...")

  // One inventory row per product (no variants for now — kept simple for Phase 2)
  const rows = productIds.map((id) => [
    id,
    null,                                          // variant_id: null = no variant
    faker.number.int({ min: 0, max: 500 }),        // quantity
    0,                                             // version (for optimistic locking in Phase 5)
  ])
  await batchInsert("inventory", ["product_id", "variant_id", "quantity", "version"], rows)
}

async function seedOrders(userIds: string[], productIds: string[]): Promise<void> {
  console.log("Seeding orders...")

  // Pick a small sample of users to have orders (not all 500)
  const activeUsers = faker.helpers.arrayElements(userIds, 500)

  for (const userId of activeUsers) {
    const orderCount = faker.number.int({ min: 1, max: COUNT.ordersPerUser })
    const orderRows: unknown[][] = []

    for (let i = 0; i < orderCount; i++) {
      orderRows.push([
        userId,
        faker.helpers.arrayElement(["paid", "shipped", "cancelled"]),
        faker.commerce.price({ min: 10, max: 5000 }),
      ])
    }

    const orderIds = await batchInsert(
      "orders",
      ["user_id", "status", "total_amount"],
      orderRows,
      500
    )

    // 1–4 items per order
    const itemRows: unknown[][] = []
    for (const orderId of orderIds) {
      const itemCount = faker.number.int({ min: 1, max: 4 })
      for (let j = 0; j < itemCount; j++) {
        itemRows.push([
          orderId,
          faker.helpers.arrayElement(productIds),
          null,
          faker.number.int({ min: 1, max: 5 }),
          faker.commerce.price({ min: 5, max: 500 }),
        ])
      }
    }

    await batchInsert(
      "order_items",
      ["order_id", "product_id", "variant_id", "quantity", "price_at_purchase"],
      itemRows,
      500
    )
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting seed...\n")
  const start = Date.now()

  try {
    // Clear in reverse order (respect foreign keys)
    console.log("Clearing existing data...")
    await pool.query(`
      TRUNCATE order_items, orders, inventory, product_images,
               saved_products, cart_items, carts, products,
               categories, merchants, users
      RESTART IDENTITY CASCADE
    `)

    const merchantIds = await seedMerchants()
    const categoryIds = await seedCategories()
    const userIds     = await seedUsers()
    const productIds  = await seedProducts(merchantIds, categoryIds)

    await seedProductImages(productIds)
    await seedInventory(productIds)
    await seedOrders(userIds, productIds)

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`\n✅ Seed complete in ${elapsed}s`)
  } catch (err) {
    console.error("\n❌ Seed failed:", (err as Error).message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seed()
