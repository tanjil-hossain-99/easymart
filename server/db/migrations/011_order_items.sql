CREATE TABLE IF NOT EXISTS order_items (
  id               UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id         UUID           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       UUID           NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id       UUID           REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity         INTEGER        NOT NULL CHECK (quantity > 0),
  price_at_purchase NUMERIC(10, 2) NOT NULL,  -- snapshot of price when order was placed
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
