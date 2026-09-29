CREATE TABLE IF NOT EXISTS inventory (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  UUID    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID    REFERENCES product_variants(id) ON DELETE CASCADE, -- null = no variant
  quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  version     INTEGER NOT NULL DEFAULT 0,  -- used for optimistic locking in Phase 5
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (product_id, variant_id)  -- one inventory row per product+variant combo
);
