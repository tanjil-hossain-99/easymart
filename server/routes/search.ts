import { Request, Response, Router } from "express";
import { searchClient } from "../config/algolia.js";
import { ALGOLIA, HttpStatus, PAGINATION, UUID_REGEX } from "../constants.js";
import type { ProductListRow, ProductSearchRecord, SearchSuggestionsResponse } from "../types.js";
import { buildQuerySuggestions } from "../utils/querySuggestions.js";

const router = Router();

type SearchQuery = Partial<{
  q: string;
  category_id: string;
  min_price: string;
  max_price: string;
  has_discount: string;
  page: string;
  limit: string;
}>;

// ─── GET /search ──────────────────────────────────────────────────────────────
// Full-text product search via Algolia. Same filters and response shape as
// GET /products, so the frontend can reuse the same product grid.
//
// Why go through our server instead of the browser calling Algolia directly?
// We can change search providers, add auth/rate limits, or log queries without
// touching the frontend — at the cost of one extra network hop.
router.get("/", async (req: Request<{}, {}, {}, SearchQuery>, res: Response) => {
  const { q = "", category_id, min_price, max_price, has_discount } = req.query;

  // Algolia filters are a string like: category_id:"abc" AND price >= 10.
  // Never paste raw user input into it — validate first (same idea as SQL injection).
  const filters: string[] = [];

  if (category_id) {
    if (!UUID_REGEX.test(category_id)) {
      res.status(HttpStatus.BadRequest).json({ error: "Invalid category_id" });
      return;
    }
    // category_ids holds the product's category + its department → subcategories included
    filters.push(`category_ids:"${category_id}"`);
  }

  // Filter on the price after discount — the price the customer sees
  const minPrice = Number(min_price);
  if (min_price && Number.isFinite(minPrice)) filters.push(`final_price >= ${minPrice}`);

  const maxPrice = Number(max_price);
  if (max_price && Number.isFinite(maxPrice)) filters.push(`final_price <= ${maxPrice}`);

  if (has_discount === "true") filters.push("discount > 0");

  const page = Math.max(1, parseInt(req.query.page ?? "") || PAGINATION.defaultPage);
  const limit = Math.min(
    ALGOLIA.maxHitsPerPage,
    Math.max(1, parseInt(req.query.limit ?? "") || ALGOLIA.defaultHitsPerPage),
  );

  const result = await searchClient.searchSingleIndex<ProductSearchRecord>({
    indexName: ALGOLIA.productsIndex,
    searchParams: {
      query: q,
      filters: filters.join(" AND "),
      page: page - 1, // Algolia pages start at 0, our API at 1
      hitsPerPage: limit,
    },
  });

  // Map Algolia records back to the same shape GET /products returns
  const data: ProductListRow[] = result.hits.map((hit) => ({
    id: hit.objectID,
    title: hit.title,
    price: hit.price.toFixed(2),
    discount: hit.discount.toFixed(2),
    final_price: hit.final_price.toFixed(2),
    category_id: hit.category_id,
    merchant_id: hit.merchant_id,
    merchant_name: hit.merchant_name,
    created_at: new Date(hit.created_at),
    primary_image: hit.primary_image,
  }));

  const total = result.nbHits ?? 0;
  res.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: result.nbPages ?? 0,
    },
  });
});

// ─── GET /search/suggestions?q=gra&category_id=… ──────────────────────────────
// Autocomplete for the header search box. One Algolia request gives us both
// query completions (built from titles) and product suggestions (with images).
type SuggestionsQuery = Partial<{ q: string; category_id: string }>;

router.get("/suggestions", async (req: Request<{}, {}, {}, SuggestionsQuery>, res: Response) => {
  const q = (req.query.q ?? "").trim();
  const { category_id } = req.query;

  const empty: SearchSuggestionsResponse = { queries: [], products: [] };
  if (q.length < ALGOLIA.minSuggestionQueryLength) {
    res.json(empty);
    return;
  }
  if (category_id && !UUID_REGEX.test(category_id)) {
    res.status(HttpStatus.BadRequest).json({ error: "Invalid category_id" });
    return;
  }

  const result = await searchClient.searchSingleIndex<Pick<ProductSearchRecord, "title" | "primary_image">>({
    indexName: ALGOLIA.productsIndex,
    searchParams: {
      query: q,
      filters: category_id ? `category_ids:"${category_id}"` : "",
      hitsPerPage: ALGOLIA.suggestionHits,
      // Only fetch what the dropdown shows — smaller, faster responses
      attributesToRetrieve: ["title", "primary_image"],
      attributesToHighlight: [],
    },
  });

  const response: SearchSuggestionsResponse = {
    queries: buildQuerySuggestions(
      q,
      result.hits.map((hit) => hit.title),
      ALGOLIA.maxQuerySuggestions,
    ),
    products: result.hits.slice(0, ALGOLIA.maxProductSuggestions).map((hit) => ({
      id: hit.objectID,
      title: hit.title,
      primary_image: hit.primary_image,
    })),
  };
  res.json(response);
});

export default router;
