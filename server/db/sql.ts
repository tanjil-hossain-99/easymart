// Reusable SQL fragments. Keeping them in one place guarantees the cart page and
// checkout calculate prices exactly the same way.

// Price after discount + variant modifier.
// Expects aliases: p = products, v = product_variants (LEFT JOIN, may be NULL).
export const UNIT_PRICE_SQL = `ROUND(p.price * (1 - p.discount / 100), 2) + COALESCE(v.price_modifier, 0)`;
