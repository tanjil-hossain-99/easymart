import pool from "./pool.js";

// Adds size variants to clothing and footwear products.
// Safe to re-run: skips products that already have variants.
// Run: cd server && npx tsx db/seed-variants.ts

const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const SHOE_SIZES = ["US 7", "US 8", "US 9", "US 10", "US 11", "US 12"];

const CATEGORY_CONFIG: Record<string, { type: string; values: string[] }> = {
  "T-Shirts":           { type: "Size", values: CLOTHING_SIZES },
  "Hoodies & Sweatshirts": { type: "Size", values: CLOTHING_SIZES },
  "Jeans":              { type: "Size", values: CLOTHING_SIZES },
  "Dresses":            { type: "Size", values: CLOTHING_SIZES },
  "Running Shoes":      { type: "Size", values: SHOE_SIZES },
  "Sneakers":           { type: "Size", values: SHOE_SIZES },
  "Boots":              { type: "Size", values: SHOE_SIZES },
};

async function seedVariants() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let totalVariants = 0;
    let totalProducts = 0;

    for (const [categoryName, { type, values }] of Object.entries(CATEGORY_CONFIG)) {
      // Pick up to 20 products in this category that have no variants yet
      const { rows: products } = await client.query<{ id: string; title: string }>(
        `SELECT p.id, p.title
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE c.name = $1
           AND p.is_active = true
           AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id)
         ORDER BY p.created_at DESC
         LIMIT 20`,
        [categoryName],
      );

      if (products.length === 0) {
        console.log(`  ${categoryName}: already seeded or no products found`);
        continue;
      }

      for (const product of products) {
        // Insert one variant per size
        for (const value of values) {
          const { rows: [variant] } = await client.query<{ id: string }>(
            `INSERT INTO product_variants (product_id, type, value, price_modifier)
             VALUES ($1, $2, $3, 0)
             RETURNING id`,
            [product.id, type, value],
          );

          // Random stock 3–15 per size; some sizes intentionally low to show "low stock"
          const qty = Math.floor(Math.random() * 13) + 3;
          await client.query(
            `INSERT INTO inventory (product_id, variant_id, quantity, version)
             VALUES ($1, $2, $3, 1)
             ON CONFLICT (product_id, variant_id) DO NOTHING`,
            [product.id, variant.id, qty],
          );

          totalVariants++;
        }

        // Zero out the base (variant_id = null) row so stock comes from variants
        await client.query(
          `UPDATE inventory SET quantity = 0 WHERE product_id = $1 AND variant_id IS NULL`,
          [product.id],
        );

        totalProducts++;
      }

      console.log(`  ${categoryName}: added ${values.length} variants × ${products.length} products`);
    }

    await client.query("COMMIT");
    console.log(`\nDone — ${totalVariants} variant rows across ${totalProducts} products`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedVariants().catch((err) => {
  console.error("Seed failed:", (err as Error).message);
  process.exit(1);
});
