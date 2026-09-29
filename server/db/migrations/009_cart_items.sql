CREATE TABLE IF NOT EXISTS cart_items (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_id     UUID    NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id  UUID    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID    REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (cart_id, product_id, variant_id)  -- prevent duplicate rows for same product+variant
);
