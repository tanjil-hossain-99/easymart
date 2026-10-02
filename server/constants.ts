// Enum-style constants: `as const` object + a union type derived from its values.
// Works like a TS `enum` (UserRole.Admin) but compiles to a plain object.

// Must match the CHECK constraint on users.role. Keep in sync with client/src/lib/constants.ts
export const UserRole = {
  User: "user",
  Admin: "admin",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const HttpStatus = {
  OK: 200,
  Created: 201,
  NoContent: 204,
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  Conflict: 409,
  InternalServerError: 500,
} as const;
export type HttpStatus = (typeof HttpStatus)[keyof typeof HttpStatus];

// https://www.postgresql.org/docs/current/errcodes-appendix.html
export const PgErrorCode = {
  UniqueViolation: "23505",
  InvalidTextRepresentation: "22P02", // e.g. "abc" where a UUID is expected
} as const;
export type PgErrorCode = (typeof PgErrorCode)[keyof typeof PgErrorCode];

export const AUTH = {
  bearerPrefix: "Bearer ",
  tokenExpiresIn: "7d",
  bcryptRounds: 10,
  passwordMinLength: 8,
} as const;

export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
} as const;

// Keep in sync with client/src/lib/constants.ts
export const ProductSort = {
  Newest: "newest",
  PriceAsc: "price_asc",
  PriceDesc: "price_desc",
  DiscountDesc: "discount_desc",
  Deals: "deals", // random picks from high-discount products — rotates on each load
} as const;
export type ProductSort = (typeof ProductSort)[keyof typeof ProductSort];

export const CART = {
  defaultAddQuantity: 1,
} as const;

// category_attributes.type values — decides how an attribute is filtered and displayed
export const AttributeType = {
  Enum: "enum", // pick from a list: display_type = OLED / QLED / LED
  Number: "number", // filtered by ranges: screen_size 44–52.9 in
  Boolean: "boolean", // a single checkbox: noise_cancelling
} as const;
export type AttributeType = (typeof AttributeType)[keyof typeof AttributeType];

// Must match the CHECK constraint on orders.status. Keep in sync with the client.
export const OrderStatus = {
  Pending: "pending",    // created, waiting for payment (Stripe)
  Confirmed: "confirmed", // COD order placed, payment on delivery
  Paid: "paid",
  Shipped: "shipped",
  Cancelled: "cancelled",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

// Must match the CHECK constraint on payments.status
export const PaymentStatus = {
  Pending: "pending",
  Succeeded: "succeeded",
  Failed: "failed",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

// Stripe webhook event types we handle
export const StripeEvent = {
  PaymentIntentSucceeded: "payment_intent.succeeded",
  PaymentIntentFailed: "payment_intent.payment_failed",
} as const;
export type StripeEvent = (typeof StripeEvent)[keyof typeof StripeEvent];

export const STRIPE = {
  signatureHeader: "stripe-signature",
} as const;

export const ALGOLIA = {
  productsIndex: "products",
  // Free plan record limit — we index the newest N active products. Raise on a paid plan.
  maxRecords: 10_000,
  batchSize: 1_000, // records per upload request
  descriptionMaxLength: 500, // keep records small (Algolia bills/limits by record size too)
  defaultHitsPerPage: 20,
  maxHitsPerPage: 100,
  // Autocomplete
  minSuggestionQueryLength: 2, // "a" matches almost everything — not useful, wastes quota
  suggestionHits: 20, // products scanned to build query suggestions
  maxSuggestions: 10, // rows in the dropdown, like Amazon
  // Dynamic filters: a category's filters are shown only if it holds at least this share
  // of the results ("tv" → 95% Televisions → TV filters; "black" → mixed → no type filters)
  dominantCategoryMinShare: 0.5,
  attributeFacetPrefix: "attributes.", // attributes are nested in records: attributes.screen_size
} as const;

// URL/API params for the dynamic filters. Keep in sync with client/src/lib/constants.ts
//   ?brand=LG&brand=Sony                 → brand is LG OR Sony
//   ?a.display_type=OLED&a.screen_size=45-56 → attributes (a. prefix), number ranges as "min-max"
export const FACET_PARAM = {
  brand: "brand",
  attributePrefix: "a.",
  rangeSeparator: "-", // "45-56", "-33" (up to 33), "70-" (70 and above)
} as const;

// Used to validate ids before putting them in an Algolia filter string
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PAYMENT = {
  currency: "usd", // must match the payments.currency default
  // Stripe amounts are integers in the smallest unit: $12.34 → 1234 cents
  minorUnitsPerMajor: 100,
} as const;
