import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { CATALOG } from "./catalog.js";

// Usage: yarn catalog:images
// Fetches real product photo URLs from DummyJSON (a free test-data API) ONCE and saves
// them to images.json, keyed by product type. The seed reads that file, so seeding
// works offline and gives the same images every time.

const DUMMYJSON_URL = "https://dummyjson.com/products/category";
const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), "images.json");

type DummyProduct = { title: string; images: string[] };

async function fetchCategory(category: string): Promise<DummyProduct[]> {
  const res = await fetch(`${DUMMYJSON_URL}/${category}?limit=0&select=title,images`);
  if (!res.ok) throw new Error(`DummyJSON ${category}: HTTP ${res.status}`);
  return ((await res.json()) as { products: DummyProduct[] }).products;
}

const result: Record<string, string[]> = {};

for (const department of CATALOG) {
  for (const type of department.productTypes) {
    if (!type.images) continue;
    const products = (await Promise.all(type.images.categories.map(fetchCategory))).flat();
    const matching = type.images.titleMatch
      ? products.filter((p) => type.images!.titleMatch!.test(p.title))
      : products;
    result[type.name] = matching.flatMap((p) => p.images);
    console.log(`  ${type.name.padEnd(22)} ${result[type.name].length} images`);
  }
}

writeFileSync(OUTPUT, JSON.stringify(result, null, 2) + "\n");
console.log(`✅ Saved ${OUTPUT}`);
