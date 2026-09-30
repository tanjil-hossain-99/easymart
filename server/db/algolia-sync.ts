import { ALGOLIA } from "../constants.js";
import { adminClient } from "../config/algolia.js";
import type { ProductSearchRecord } from "../types.js";
import pool from "./pool.js";
import { FINAL_PRICE_SQL } from "./sql.js";

// Usage: yarn algolia:sync
// Copies products from Postgres (the source of truth) into Algolia (a search copy).
// Safe to re-run: records are keyed by objectID = product id, so existing ones are
// overwritten instead of duplicated.

type ProductForIndexRow = Omit<
  ProductSearchRecord,
  "objectID" | "price" | "discount" | "final_price" | "created_at" | "category_ids"
> & {
  id: string;
  price: string; // NUMERIC comes back from pg as a string
  discount: string;
  final_price: string;
  created_at: Date;
  parent_category_id: string | null;
};

async function sync() {
  console.log(`Loading up to ${ALGOLIA.maxRecords} active products from Postgres...`);

  const result = await pool.query<ProductForIndexRow>(
    `SELECT
       p.id, p.title, LEFT(COALESCE(p.description, ''), $1) AS description,
       p.price, p.discount, ${FINAL_PRICE_SQL} AS final_price, p.created_at,
       EXTRACT(EPOCH FROM p.created_at)::BIGINT AS created_at_ts,
       c.id AS category_id, c.parent_id AS parent_category_id, c.name AS category_name,
       m.id AS merchant_id, m.name AS merchant_name,
       pi.url AS primary_image
     FROM products p
     JOIN categories c ON c.id = p.category_id
     JOIN merchants m ON m.id = p.merchant_id
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
     WHERE p.is_active = true
     ORDER BY p.created_at DESC
     LIMIT $2`,
    [ALGOLIA.descriptionMaxLength, ALGOLIA.maxRecords],
  );

  const records: ProductSearchRecord[] = result.rows.map(
    ({ id, price, discount, final_price, created_at, created_at_ts, parent_category_id, ...rest }) => ({
      ...rest,
      objectID: id,
      price: Number(price),
      discount: Number(discount),
      final_price: Number(final_price),
      // Both ids, so filtering by a department also finds products in its subcategories
      category_ids: parent_category_id ? [rest.category_id, parent_category_id] : [rest.category_id],
      created_at: created_at.toISOString(),
      created_at_ts: Number(created_at_ts), // BIGINT also arrives as a string
    }),
  );

  // Index settings: what's searchable, what's filterable, how to break ties
  await adminClient.setSettings({
    indexName: ALGOLIA.productsIndex,
    indexSettings: {
      // Order = importance: a match in the title beats a match in the description.
      // unordered(): position of the word inside the description doesn't matter
      searchableAttributes: ["title", "category_name", "merchant_name", "unordered(description)"],
      // filterOnly: we filter by category ids but never show counts per id
      attributesForFaceting: ["filterOnly(category_ids)"],
      // When relevance ties, show bigger discounts, then newer products first
      customRanking: ["desc(discount)", "desc(created_at_ts)"],
    },
  });

  console.log(`Uploading ${records.length} records in batches of ${ALGOLIA.batchSize}...`);
  await adminClient.saveObjects({
    indexName: ALGOLIA.productsIndex,
    objects: records,
    batchSize: ALGOLIA.batchSize,
    waitForTasks: true, // wait until Algolia has actually indexed them
  });

  console.log(`✅ Indexed ${records.length} products into "${ALGOLIA.productsIndex}"`);
  await pool.end();
}

sync().catch(async (err) => {
  console.error("❌ Algolia sync failed:", (err as Error).message);
  await pool.end();
  process.exit(1);
});
