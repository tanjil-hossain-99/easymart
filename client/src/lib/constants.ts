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

export const PRODUCT_SORT_LABELS: Record<ProductSort, string> = {
  [ProductSort.Newest]: "Newest",
  [ProductSort.PriceAsc]: "Price ↑",
  [ProductSort.PriceDesc]: "Price ↓",
}

export const AUTH = {
  passwordMinLength: 8,
} as const

export const CART = {
  minQuantity: 1,
  defaultAddQuantity: 1,
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
  cart: "/cart",
  cartItems: "/cart/items",
  cartItem: (id: string) => `/cart/items/${id}`,
  checkout: "/checkout",
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
  productDetail: "/products/:id", // pattern for <Route path>
  login: "/login",
  register: "/register",
  cart: "/cart",
  checkout: "/checkout/:orderId",
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
  cart: "cart",
  order: "order",
} as const

const MINUTE = 60 * 1000

export const STALE_TIME = {
  default: 1 * MINUTE,
  categories: 5 * MINUTE, // categories rarely change
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
