import { ALGOLIA } from "../constants.js";
import { adminClient } from "../config/algolia.js";
import type { ProductSearchRecord } from "../types.js";
import pool from "./pool.js";
import { FINAL_PRICE_SQL } from "./sql.js";

// Usage: yarn algolia:sync
// Rebuilds the Algolia index from Postgres (the source of truth). Algolia is only a
// search copy, so the index is cleared first — otherwise products that no longer exist
// (e.g. after a reseed, which creates new ids) would stay searchable as "ghost" results.
// Trade-off: search is empty for the ~2 minutes the rebuild takes. Fine for dev; a live
// store would build a new index and swap it in atomically (replaceAllObjects).

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
  // The free plan holds maxRecords products, but the catalog has more. Give every
  // category a fair share — "newest N overall" could leave whole product types
  // (e.g. every TV) out of search, because products are created type by type.
  const categories = await pool.query<{ count: string }>(
    `SELECT COUNT(DISTINCT category_id) AS count FROM products WHERE is_active = true`,
  );
  const perCategory = Math.floor(ALGOLIA.maxRecords / Number(categories.rows[0].count));
  console.log(`Loading up to ${perCategory} active products per category from Postgres...`);

  const result = await pool.query<ProductForIndexRow>(
    `SELECT
       p.id, p.title, LEFT(COALESCE(p.description, ''), $1) AS description,
       p.price, p.discount, ${FINAL_PRICE_SQL} AS final_price, p.created_at,
       EXTRACT(EPOCH FROM p.created_at)::BIGINT AS created_at_ts,
       c.id AS category_id, c.parent_id AS parent_category_id, c.name AS category_name,
       m.id AS merchant_id, m.name AS merchant_name,
       p.brand, p.attributes,
       pi.url AS primary_image
     FROM (
       -- Number products within each category (newest first), keep the first N of each
       SELECT *, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at DESC, id) AS rank_in_category
       FROM products
       WHERE is_active = true
     ) p
     JOIN categories c ON c.id = p.category_id
     JOIN merchants m ON m.id = p.merchant_id
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
     WHERE p.rank_in_category <= $2`,
    [ALGOLIA.descriptionMaxLength, perCategory],
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

  // Every attribute any category can filter by (screen_size, fit, ram, …)
  const keys = await pool.query<{ key: string }>(`SELECT DISTINCT key FROM category_attributes ORDER BY key`);
  const attributeKeys = keys.rows.map((row) => row.key);

  const sharedSettings = {
    searchableAttributes: ["title", "brand", "category_name", "merchant_name", "unordered(description)"],
    attributesForFaceting: [
      "filterOnly(category_ids)",
      "category_id",
      "brand",
      ...attributeKeys.map((key) => `${ALGOLIA.attributeFacetPrefix}${key}`),
    ],
  };

  // Index settings: what's searchable, what's filterable, how to break ties.
  // replicas declares the sort-order copies — Algolia creates them automatically.
  await adminClient.setSettings({
    indexName: ALGOLIA.productsIndex,
    indexSettings: {
      ...sharedSettings,
      customRanking: ["desc(discount)", "desc(created_at_ts)"],
      replicas: Object.values(ALGOLIA.replicas),
    },
  });

  // Each replica needs its own ranking — that's what makes it sort differently
  await Promise.all([
    adminClient.setSettings({
      indexName: ALGOLIA.replicas.price_asc,
      indexSettings: { ...sharedSettings, ranking: ["asc(final_price)"] },
    }),
    adminClient.setSettings({
      indexName: ALGOLIA.replicas.price_desc,
      indexSettings: { ...sharedSettings, ranking: ["desc(final_price)"] },
    }),
    adminClient.setSettings({
      indexName: ALGOLIA.replicas.newest,
      indexSettings: { ...sharedSettings, ranking: ["desc(created_at_ts)"] },
    }),
    adminClient.setSettings({
      indexName: ALGOLIA.replicas.discount_desc,
      indexSettings: { ...sharedSettings, ranking: ["desc(discount)"] },
    }),
  ]);

  console.log("Clearing the old index...");
  const cleared = await adminClient.clearObjects({ indexName: ALGOLIA.productsIndex });
  await adminClient.waitForTask({ indexName: ALGOLIA.productsIndex, taskID: cleared.taskID });

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
