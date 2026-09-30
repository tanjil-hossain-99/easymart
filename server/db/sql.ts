// Reusable SQL fragments. Keeping them in one place guarantees the cart page and
// checkout calculate prices exactly the same way.

// Price after discount — what the customer actually pays for the base product.
// Expects alias: p = products.
export const FINAL_PRICE_SQL = `ROUND(p.price * (1 - p.discount / 100), 2)`;

// Final price + variant modifier (cart and checkout).
// Expects aliases: p = products, v = product_variants (LEFT JOIN, may be NULL).
export const UNIT_PRICE_SQL = `${FINAL_PRICE_SQL} + COALESCE(v.price_modifier, 0)`;

// Matches a category AND its subcategories (the tree is 2 levels: department → subcategory),
// so filtering by "Electronics" includes products filed under "Electronics › Laptops".
// Takes the category id as the given $ placeholder.
export const inCategoryTreeSql = (placeholder: string) =>
  `p.category_id IN (SELECT id FROM categories WHERE id = ${placeholder} OR parent_id = ${placeholder})`;
