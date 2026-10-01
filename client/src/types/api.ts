import type { AttributeType, OrderStatus, ProductSort, UserRole } from "@/lib/constants"

// Shapes of the server's JSON responses.
// Money fields are strings: Postgres NUMERIC comes back as a string to avoid float rounding.

// ── Auth ───────────────────────────────────────────────────────────────────

export type User = {
  id: string
  email: string
  role: UserRole
}

export type UserProfile = {
  id: string
  email: string
  role: UserRole
  avatar_url: string | null
  created_at: string
}

export type Address = {
  id: string
  full_name: string
  line1: string
  line2: string | null
  city: string
  state: string
  postal_code: string
  country: string
  is_default: boolean
  created_at: string
}

export type AddressInput = Omit<Address, "id" | "created_at">

export type Credentials = {
  email: string
  password: string
}

export type AuthResponse = {
  token: string
  user: User
}

// Error body the server sends: { error: "..." }
export type ApiErrorBody = {
  error?: string
}

// ── Products ───────────────────────────────────────────────────────────────

export type Product = {
  id: string
  title: string
  price: string // list price (before discount)
  discount: string // percentage, e.g. "42.99"
  final_price: string // price after discount, calculated by the server
  category_id: string
  merchant_id: string
  merchant_name: string
  created_at: string
  primary_image: string | null
}

export type ProductImage = { id: string; url: string; is_primary: boolean }

export type ProductVariant = { id: string; type: string; value: string; price_modifier: string }

export type InventoryItem = { variant_id: string | null; quantity: number }

export type ProductDetail = Product & {
  description: string
  merchant_name: string
  merchant_url: string
  merchant_logo: string
  category_name: string
  category_slug: string
  stripe_product_id: string | null
  stripe_price_id: string | null
  images: ProductImage[]
  variants: ProductVariant[]
  inventory: InventoryItem[]
}

export type Category = {
  id: string
  name: string
  slug: string
  parent_id: string | null
}

export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ── Dynamic filters (only on /search responses) ────────────────────────────

export type FacetOption = {
  value: string // goes in the URL: "LG", "true", or a range "45-56"
  label: string // shown: "LG", "45 to 56 in"
  count: number
  selected: boolean
}

export type FacetGroup = {
  param: string // URL param: "brand" or "a.screen_size"
  label: string
  type: AttributeType
  options: FacetOption[]
}

export type SearchFacets = {
  categoryId: string | null // dominant category whose filters are shown (null = mixed results)
  groups: FacetGroup[]
}

// Selected dynamic filters: URL param → chosen values, e.g. { brand: ["LG"], "a.screen_size": ["45-56"] }
export type FacetSelections = Record<string, string[]>

export type ProductsResponse = {
  data: Product[]
  pagination: Pagination
  facets?: SearchFacets // present on /search responses
}

export type ProductFilters = {
  category_id?: string
  min_price?: string
  max_price?: string
  has_discount?: boolean
  sort?: ProductSort
  page?: number
  limit?: number
}

// One autocomplete row. Always a search query — clicking it searches, like Amazon;
// the image is only a visual hint from a matching product.
export type QuerySuggestion = {
  text: string
  image: string | null
}

export type SearchSuggestions = {
  suggestions: QuerySuggestion[]
}

// Everything the catalog page can be filtered by (lives in the URL)
export type CatalogFilters = ProductFilters & {
  q?: string
  facets?: FacetSelections
}

// Search uses the same filters, minus sort (Algolia orders by relevance), plus the text query
export type SearchFilters = Omit<ProductFilters, "sort"> & {
  q: string
  facets?: FacetSelections
}

// ── Cart ───────────────────────────────────────────────────────────────────

export type CartItem = {
  id: string
  product_id: string
  variant_id: string | null
  quantity: number
  title: string
  price: string
  discount: string
  primary_image: string | null
  variant_type: string | null
  variant_value: string | null
  stock: number | null
  unit_price: string // price after discount + variant modifier, calculated by the server
}

export type Cart = {
  id: string
  items: CartItem[]
  subtotal: string
}

export type AddCartItemInput = {
  product_id: string
  variant_id?: string | null
  quantity?: number
}

export type UpdateCartItemInput = {
  id: string
  quantity: number
}

// ── Orders & checkout ──────────────────────────────────────────────────────

export type CheckoutResponse = {
  orderId: string
  totalAmount: string
  clientSecret: string
}

export type OrderItem = {
  id: string
  product_id: string
  title: string
  primary_image: string | null
  quantity: number
  price_at_purchase: string
  line_total: string // price_at_purchase × quantity, calculated by the server
}

export type OrderSummary = {
  id: string
  status: OrderStatus
  total_amount: string
  created_at: string
  item_count: number
  preview_image: string | null
  first_title: string | null
}

export type Order = {
  id: string
  status: OrderStatus
  total_amount: string
  payment_method: "stripe" | "cod"
  created_at: string
  items: OrderItem[]
  clientSecret: string | null // only present while a Stripe order is unpaid
}
