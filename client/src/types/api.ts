import type { OrderStatus, ProductSort, UserRole } from "@/lib/constants"

// Shapes of the server's JSON responses.
// Money fields are strings: Postgres NUMERIC comes back as a string to avoid float rounding.

// ── Auth ───────────────────────────────────────────────────────────────────

export type User = {
  id: string
  email: string
  role: UserRole
}

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

export type ProductsResponse = {
  data: Product[]
  pagination: Pagination
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

export type ProductSuggestion = {
  id: string
  title: string
  primary_image: string | null
}

export type SearchSuggestions = {
  queries: string[]
  products: ProductSuggestion[]
}

// Everything the catalog page can be filtered by (lives in the URL)
export type CatalogFilters = ProductFilters & {
  q?: string
}

// Search uses the same filters, minus sort (Algolia orders by relevance), plus the text query
export type SearchFilters = Omit<ProductFilters, "sort"> & {
  q: string
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
}

export type Order = {
  id: string
  status: OrderStatus
  total_amount: string
  created_at: string
  items: OrderItem[]
  clientSecret: string | null // only present while the order is unpaid
}
