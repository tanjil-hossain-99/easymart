CREATE TABLE IF NOT EXISTS invoices (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID        NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  file_path   VARCHAR(500) NOT NULL,  -- path to the generated PDF on disk
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
