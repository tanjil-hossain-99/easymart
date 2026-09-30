import "dotenv/config"
import { readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import bcrypt from "bcryptjs"
import { faker } from "@faker-js/faker"
import { AUTH, AttributeType, OrderStatus, UserRole } from "../constants.js"
import { CATALOG } from "./catalog/catalog.js"
import { generateProduct } from "./catalog/generate.js"
import type { ProductTypeDef } from "./catalog/types.js"
import pool from "./pool.js"
import { FINAL_PRICE_SQL } from "./sql.js"

// ─── Config ────────────────────────────────────────────────────────────────
const COUNT = {
  merchants: 20,
  users: 500,
  products: 50_000, // spread evenly across the catalog's product types
  ordersPerUser: 10,
}

const IMAGES_PER_PRODUCT = { min: 1, max: 3 }
const INVENTORY = { max: 500, outOfStockChance: 0.05 }

// Known logins for manual testing (the 500 random users can't log in — no real hashes)
const TEST_PASSWORD = "password123"
const TEST_ACCOUNTS = [
  { email: "test@example.com", role: UserRole.Admin },
  { email: "customer@example.com", role: UserRole.User },
]

// Real product photos per product type, fetched once by `yarn catalog:images`
const IMAGES_FILE = join(dirname(fileURLToPath(import.meta.url)), "catalog", "images.json")
const PRODUCT_IMAGES: Record<string, string[]> = JSON.parse(readFileSync(IMAGES_FILE, "utf-8"))

// Product types without real photos get a labelled tile instead of an unrelated photo
const placeholderImage = (label: string) =>
  `https://placehold.co/600x600/f3f4f6/6b7280/png?text=${encodeURIComponent(label)}`

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

const slugify = (name: string) => faker.helpers.slugify(name).toLowerCase()

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

// Departments → product types (subcategories) → each type's filter definitions.
// Returns product type name → category id.
async function seedCatalogCategories(): Promise<Map<string, string>> {
  console.log("Seeding categories and their filter attributes...")
  const categoryIdByType = new Map<string, string>()

  for (const department of CATALOG) {
    const [departmentId] = await batchInsert(
      "categories",
      ["name", "slug", "parent_id"],
      [[department.name, slugify(department.name), null]]
    )

    for (const type of department.productTypes) {
      const [categoryId] = await batchInsert(
        "categories",
        ["name", "slug", "parent_id"],
        [[type.name, slugify(type.name), departmentId]]
      )
      categoryIdByType.set(type.name, categoryId)

      const attributeRows = type.attributes.map((def, position) => [
        categoryId,
        def.key,
        def.label,
        def.type,
        def.type === AttributeType.Number ? def.unit : null,
        def.type === AttributeType.Number ? JSON.stringify(def.buckets) : null,
        position,
      ])
      await batchInsert(
        "category_attributes",
        ["category_id", "key", "label", "type", "unit", "buckets", "position"],
        attributeRows
      )
    }
  }
  return categoryIdByType
}

async function seedUsers(): Promise<string[]> {
  console.log("Seeding users...")
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, AUTH.bcryptRounds)
  const testRows = TEST_ACCOUNTS.map((a) => [a.email, passwordHash, a.role, null])

  const randomRows = Array.from({ length: COUNT.users }, () => [
    faker.internet.email().toLowerCase(),
    faker.internet.password(), // not a bcrypt hash — these users can't log in, they only own orders
    UserRole.User,
    faker.image.avatar(),
  ])
  return batchInsert("users", ["email", "password_hash", "role", "avatar_url"], [...testRows, ...randomRows])
}

type SeededProduct = { id: string; type: ProductTypeDef }

async function seedProducts(
  merchantIds: string[],
  categoryIdByType: Map<string, string>
): Promise<SeededProduct[]> {
  const types = CATALOG.flatMap((d) => d.productTypes)
  const perType = Math.ceil(COUNT.products / types.length)
  console.log(`Seeding products (${perType} × ${types.length} product types)...`)

  const rows: unknown[][] = []
  const productTypes: ProductTypeDef[] = [] // same order as rows, to pair with returned ids

  for (const type of types) {
    for (let i = 0; i < perType; i++) {
      const p = generateProduct(type)
      rows.push([
        p.title,
        p.description,
        p.price,
        p.discount,
        faker.helpers.arrayElement(merchantIds),
        categoryIdByType.get(type.name),
        true,
        p.brand,
        JSON.stringify(p.attributes),
      ])
      productTypes.push(type)
    }
  }

  const ids = await batchInsert(
    "products",
    ["title", "description", "price", "discount", "merchant_id", "category_id", "is_active", "brand", "attributes"],
    rows
  )
  return ids.map((id, i) => ({ id, type: productTypes[i] }))
}

async function seedProductImages(products: SeededProduct[]): Promise<void> {
  console.log("Seeding product images...")

  const rows: unknown[][] = []
  for (const { id, type } of products) {
    const pool = PRODUCT_IMAGES[type.name]
    const urls = pool?.length
      ? faker.helpers.arrayElements(pool, IMAGES_PER_PRODUCT) // distinct real photos
      : [placeholderImage(type.name)]
    urls.forEach((url, i) => rows.push([id, url, i === 0])) // first image is primary
  }
  await batchInsert("product_images", ["product_id", "url", "is_primary"], rows)
}

async function seedInventory(products: SeededProduct[]): Promise<void> {
  console.log("Seeding inventory...")

  const rows = products.map(({ id }) => [
    id,
    null, // variant_id: null = stock for the product itself (variants come later)
    faker.datatype.boolean(INVENTORY.outOfStockChance) ? 0 : faker.number.int({ min: 1, max: INVENTORY.max }),
    0, // version (for optimistic locking in Phase 5)
  ])
  await batchInsert("inventory", ["product_id", "variant_id", "quantity", "version"], rows)
}

async function seedOrders(userIds: string[], productIds: string[]): Promise<void> {
  console.log("Seeding orders...")

  const orderStatuses = [OrderStatus.Paid, OrderStatus.Shipped, OrderStatus.Cancelled]

  for (const userId of userIds) {
    const orderCount = faker.number.int({ min: 1, max: COUNT.ordersPerUser })
    const orderRows = Array.from({ length: orderCount }, () => [
      userId,
      faker.helpers.arrayElement(orderStatuses),
      0, // real total is calculated from the items below
    ])
    const orderIds = await batchInsert("orders", ["user_id", "status", "total_amount"], orderRows, 500)

    // 1–4 items per order; prices are filled in from the products afterwards
    const itemRows: unknown[][] = []
    for (const orderId of orderIds) {
      const itemCount = faker.number.int({ min: 1, max: 4 })
      for (let j = 0; j < itemCount; j++) {
        itemRows.push([orderId, faker.helpers.arrayElement(productIds), null, faker.number.int({ min: 1, max: 5 }), 0])
      }
    }
    await batchInsert(
      "order_items",
      ["order_id", "product_id", "variant_id", "quantity", "price_at_purchase"],
      itemRows,
      500
    )
  }

  // Prices and totals in SQL, with the same formula the app uses — so seeded orders
  // are consistent with what checkout would have produced
  console.log("  pricing order items and totals...")
  await pool.query(`
    UPDATE order_items oi SET price_at_purchase = ${FINAL_PRICE_SQL}
    FROM products p WHERE p.id = oi.product_id
  `)
  await pool.query(`
    UPDATE orders o SET total_amount = t.total
    FROM (SELECT order_id, SUM(price_at_purchase * quantity) AS total FROM order_items GROUP BY order_id) t
    WHERE t.order_id = o.id
  `)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting seed...\n")
  const start = Date.now()

  try {
    // Clear in reverse order (respect foreign keys)
    console.log("Clearing existing data...")
    await pool.query(`
      TRUNCATE payments, invoices, order_items, orders, inventory, product_images,
               product_variants, saved_products, cart_items, carts, products,
               category_attributes, categories, merchants, users
      RESTART IDENTITY CASCADE
    `)

    const merchantIds = await seedMerchants()
    const categoryIdByType = await seedCatalogCategories()
    const userIds = await seedUsers()
    const products = await seedProducts(merchantIds, categoryIdByType)

    await seedProductImages(products)
    await seedInventory(products)
    await seedOrders(userIds, products.map((p) => p.id))

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`\n✅ Seed complete in ${elapsed}s`)
    console.log(`   Test logins (password "${TEST_PASSWORD}"): ${TEST_ACCOUNTS.map((a) => `${a.email} (${a.role})`).join(", ")}`)
  } catch (err) {
    console.error("\n❌ Seed failed:", (err as Error).message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seed()
