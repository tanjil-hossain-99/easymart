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
} as const;
export type ProductSort = (typeof ProductSort)[keyof typeof ProductSort];

export const CART = {
  defaultAddQuantity: 1,
} as const;

// Must match the CHECK constraint on orders.status. Keep in sync with the client.
export const OrderStatus = {
  Pending: "pending", // created, waiting for payment
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

export const PAYMENT = {
  currency: "usd", // must match the payments.currency default
  // Stripe amounts are integers in the smallest unit: $12.34 → 1234 cents
  minorUnitsPerMajor: 100,
} as const;
