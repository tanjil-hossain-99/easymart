CREATE TABLE IF NOT EXISTS product_variants (
  id             UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id     UUID           NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type           VARCHAR(50)    NOT NULL,            -- e.g. 'color', 'size'
  value          VARCHAR(100)   NOT NULL,            -- e.g. 'red', 'XL'
  price_modifier NUMERIC(10, 2) NOT NULL DEFAULT 0, -- added to base price: +5.00 or -2.00
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
