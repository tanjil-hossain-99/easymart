ALTER TABLE products
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_featured_until
  ON products (featured_until)
  WHERE featured_until IS NOT NULL;
