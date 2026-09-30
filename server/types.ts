import type { AttributeType, OrderStatus, UserRole } from "./constants.js";

// ── Database rows ─────────────────────────────────────────────────────────────
// Used as pool.query<Row>() generics so result.rows is typed instead of `any`.
// Note: pg returns NUMERIC columns as strings (to avoid float precision loss).

export type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: Date;
};

// What we send to the client — never includes password_hash
export type PublicUser = Pick<UserRow, "id" | "email" | "role">;
export type UserProfile = Pick<UserRow, "id" | "email" | "role" | "avatar_url" | "created_at">;

export type IdRow = { id: string };
export type CountRow = { total: string };

export type ProductListRow = {
  id: string;
  title: string;
  price: string;
  discount: string;
  final_price: string; // price after discount
  category_id: string;
  merchant_id: string;
  merchant_name: string;
  created_at: Date;
  primary_image: string | null;
};

export type ProductDetailRow = ProductListRow & {
  description: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  is_active: boolean;
  merchant_name: string;
  merchant_url: string | null;
  merchant_logo: string | null;
  category_name: string;
  category_slug: string;
};

export type ProductImageRow = { id: string; url: string; is_primary: boolean };

export type ProductVariantRow = {
  id: string;
  type: string;
  value: string;
  price_modifier: string;
};

export type InventoryRow = { variant_id: string | null; quantity: number };

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
};

export type CartItemRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
};

export type CartItemDetailRow = CartItemRow & {
  title: string;
  price: string;
  discount: string;
  primary_image: string | null;
  variant_type: string | null;
  variant_value: string | null;
  stock: number | null;
  unit_price: string;
};

export type SubtotalRow = { subtotal: string };

export type CheckoutItemRow = {
  product_id: string;
  title: string;
  quantity: number;
  stock: number | null;
  is_active: boolean;
};

export type PaidOrderRow = { id: string; user_id: string };

export type OrderRow = {
  id: string;
  status: OrderStatus;
  total_amount: string;
  stripe_payment_intent_id: string | null;
  created_at: Date;
};

export type OrderSummaryRow = {
  id: string;
  status: OrderStatus;
  total_amount: string;
  created_at: Date;
  item_count: number; // total units across all items
};

export type OrderItemDetailRow = {
  id: string;
  product_id: string;
  title: string;
  primary_image: string | null;
  quantity: number;
  price_at_purchase: string;
  line_total: string;
};

export type OrderTotalRow = {
  id: string;
  total_amount: string;
  amount_minor: number; // total in cents, for Stripe
};

// ── Search ────────────────────────────────────────────────────────────────────

// One product as stored in Algolia. Prices are numbers here (not strings like
// in Postgres) because Algolia can only do numeric filters (price >= 10) on numbers.
export type ProductSearchRecord = {
  objectID: string; // Algolia's primary key — we use the product id
  title: string;
  description: string;
  price: number;
  discount: number;
  final_price: number; // price after discount — what filters and the UI use
  category_id: string;
  category_ids: string[]; // own category + its parent department, for department filters
  category_name: string;
  merchant_id: string;
  merchant_name: string;
  brand: string | null;
  // Type-specific filter values, e.g. { screen_size: 65, display_type: "OLED" }.
  // Faceted as "attributes.<key>" in Algolia.
  attributes: Record<string, string | number | boolean>;
  primary_image: string | null;
  created_at: string;
  created_at_ts: number; // unix seconds — Algolia can rank/sort by numbers, not date strings
};

// ── Dynamic filters (facets) ──────────────────────────────────────────────────

export type FacetOption = {
  value: string; // what goes in the URL: "LG", "true", or a range "45-56"
  label: string; // what the sidebar shows: "LG", "44.9 to 55.9 in"…
  count: number; // how many results have it (ignoring this group's own selection)
  selected: boolean;
};

export type FacetGroup = {
  param: string; // URL param: "brand" or "a.screen_size"
  label: string; // "Brand", "Screen Size"
  type: AttributeType;
  options: FacetOption[];
};

export type SearchFacets = {
  categoryId: string | null; // the dominant category whose filters are shown (null = mixed results)
  groups: FacetGroup[];
};

// One dropdown row. Always a search query (clicking it searches, like Amazon);
// the image is only a visual hint taken from a product that matches it.
export type QuerySuggestion = {
  text: string;
  image: string | null;
};

export type SearchSuggestionsResponse = {
  suggestions: QuerySuggestion[];
};

// ── Request bodies ────────────────────────────────────────────────────────────
// Partial because the client can send anything — we validate before trusting it.

export type CredentialsBody = Partial<{ email: string; password: string }>;

export type AddCartItemBody = Partial<{
  product_id: string;
  variant_id: string | null;
  quantity: number;
}>;

export type UpdateCartItemBody = Partial<{ quantity: number }>;

// ── JWT ───────────────────────────────────────────────────────────────────────

export type TokenPayload = {
  sub: string; // user id
  role: UserRole;
};
