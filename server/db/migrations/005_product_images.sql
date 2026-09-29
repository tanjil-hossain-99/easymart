CREATE TABLE IF NOT EXISTS product_images (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         VARCHAR(500) NOT NULL,
  is_primary  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
