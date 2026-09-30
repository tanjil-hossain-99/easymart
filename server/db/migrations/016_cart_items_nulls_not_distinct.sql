-- By default Postgres treats NULLs as distinct in UNIQUE constraints, so
-- (cart, product, NULL) could be inserted twice. Products without variants
-- have variant_id = NULL, which made the constraint useless for them.
-- NULLS NOT DISTINCT (Postgres 15+) makes NULL = NULL for uniqueness.
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_cart_id_product_id_variant_id_key;
ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_cart_id_product_id_variant_id_key
  UNIQUE NULLS NOT DISTINCT (cart_id, product_id, variant_id);
