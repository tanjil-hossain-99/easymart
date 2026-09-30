// Enum-style constants: `as const` object + a union type derived from its values.
// (TS `enum` isn't allowed here — tsconfig has `erasableSyntaxOnly`.)

// ── Shared with the server — keep in sync with server/constants.ts ─────────

export const UserRole = {
  User: "user",
  Admin: "admin",
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const ProductSort = {
  Newest: "newest",
  PriceAsc: "price_asc",
  PriceDesc: "price_desc",
  DiscountDesc: "discount_desc",
} as const
export type ProductSort = (typeof ProductSort)[keyof typeof ProductSort]

// Must match server OrderStatus
export const OrderStatus = {
  Pending: "pending",
  Paid: "paid",
  Shipped: "shipped",
  Cancelled: "cancelled",
} as const
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: "Awaiting payment",
  [OrderStatus.Paid]: "Paid",
  [OrderStatus.Shipped]: "Shipped",
  [OrderStatus.Cancelled]: "Cancelled",
}

// Search results are ordered by Algolia relevance — Amazon calls that "Featured"
export const RELEVANCE_SORT_LABEL = "Featured"

// Price filter shortcuts in the sidebar (applied to the price after discount).
// Picked from the catalog's price spread: ~10% under $100, median ~$580, max ~$2,000.
export type PriceRange = { min?: number; max?: number }
export const PRICE_RANGES: PriceRange[] = [
  { max: 100 },
  { min: 100, max: 250 },
  { min: 250, max: 500 },
  { min: 500, max: 1000 },
  { min: 1000 },
]

// How many page numbers to show on each side of the current page: ‹ 1 … 4 5 [6] 7 8 … 40 ›
export const PAGINATION_SIBLINGS = 2

// Homepage product rows
export const HOME = {
  rowSize: 12,
} as const

export const PRODUCT_SORT_LABELS: Record<ProductSort, string> = {
  [ProductSort.Newest]: "Newest",
  [ProductSort.PriceAsc]: "Price ↑",
  [ProductSort.PriceDesc]: "Price ↓",
  [ProductSort.DiscountDesc]: "Biggest discount",
}

export const AUTH = {
  passwordMinLength: 8,
} as const

export const CART = {
  minQuantity: 1,
  defaultAddQuantity: 1,
} as const

export const STORE_NAME = "EasyMart"

// Product page buy box
export const BUY_BOX = {
  maxQuantity: 10, // quantity dropdown stops here (or at stock, if lower) — like Amazon
  lowStockThreshold: 5, // at or below this: "Only 3 left in stock - order soon."
} as const

// ── Money ──────────────────────────────────────────────────────────────────

export const CURRENCY = {
  code: "USD",
  locale: "en-US",
} as const

export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 20,
} as const

// ── HTTP ───────────────────────────────────────────────────────────────────

export const HttpMethod = {
  Get: "GET",
  Post: "POST",
  Patch: "PATCH",
  Delete: "DELETE",
} as const
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod]

export const HttpStatus = {
  NoContent: 204,
  Unauthorized: 401,
} as const

// ── API endpoints (paths on the server) ────────────────────────────────────

export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    me: "/auth/me",
  },
  products: "/products",
  product: (id: string) => `/products/${id}`,
  categories: "/categories",
  search: "/search",
  searchSuggestions: "/search/suggestions",
  cart: "/cart",
  cartItems: "/cart/items",
  cartItem: (id: string) => `/cart/items/${id}`,
  checkout: "/checkout",
  orders: "/orders",
  order: (id: string) => `/orders/${id}`,
} as const

// ── Frontend routes (URLs in the browser) ──────────────────────────────────

export const AuthMode = {
  Login: "login",
  Register: "register",
} as const
export type AuthMode = (typeof AuthMode)[keyof typeof AuthMode]

export const ROUTES = {
  home: "/",
  search: "/s", // results page, like amazon.com/s?k=…
  productDetail: "/products/:id", // pattern for <Route path>
  login: "/login",
  register: "/register",
  cart: "/cart",
  checkout: "/checkout/:orderId",
  orders: "/orders",
  orderDetail: "/orders/:orderId",
} as const

// Build a real URL from a pattern, e.g. productUrl("abc") → "/products/abc"
export const productUrl = (id: string) => ROUTES.productDetail.replace(":id", id)
export const checkoutUrl = (orderId: string) => ROUTES.checkout.replace(":orderId", orderId)
export const orderUrl = (orderId: string) => ROUTES.orderDetail.replace(":orderId", orderId)

// ── React Query ────────────────────────────────────────────────────────────

// Central list so invalidating ("refetch the cart") uses the exact same key everywhere
export const QUERY_KEYS = {
  products: "products",
  product: "product",
  categories: "categories",
  search: "search",
  suggestions: "suggestions",
  cart: "cart",
  orders: "orders",
  order: "order",
} as const

const MINUTE = 60 * 1000

export const STALE_TIME = {
  default: 1 * MINUTE,
  categories: 5 * MINUTE, // categories rarely change
  // Typing "gra" → "gran" → back to "gra" reuses the cached result instead of a new request
  suggestions: 5 * MINUTE,
} as const

// URL query params for the catalog (/?q=…&category_id=…). Same names the API uses,
// so they can be passed straight through to /products and /search.
export const CatalogParam = {
  Query: "q",
  Category: "category_id",
  MinPrice: "min_price",
  MaxPrice: "max_price",
  HasDiscount: "has_discount",
  Sort: "sort",
  Page: "page",
} as const
export type CatalogParam = (typeof CatalogParam)[keyof typeof CatalogParam]

// KeyboardEvent.key values we handle
export const Key = {
  ArrowDown: "ArrowDown",
  ArrowUp: "ArrowUp",
  Escape: "Escape",
} as const

export const SEARCH = {
  // Wait until the user stops typing for this long before searching. Each Algolia
  // search counts against the plan quota — searching on every keystroke of
  // "chicken" would cost 7 requests instead of 1.
  debounceMs: 300,
  // Autocomplete: shorter delay so suggestions feel instant while typing
  suggestionDebounceMs: 150,
  minSuggestionLength: 2, // must match the server's minSuggestionQueryLength
} as const

// How often the order page re-checks a pending order while waiting for Stripe's webhook
export const ORDER_POLL_INTERVAL = 2 * 1000

// Query params Stripe appends to return_url after confirmPayment
export const STRIPE_REDIRECT = {
  statusParam: "redirect_status",
  failed: "failed",
} as const

// ── Storage ────────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  auth: "easymart-auth",
} as const
