-- Structured product data for Amazon-style filters.

-- Brand is a filter on every product type, so it's a real column (not inside attributes)
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);

-- Type-specific values, e.g. a TV: {"screen_size": 65, "display_type": "OLED", "smart_tv": true}
-- JSONB (not one column per attribute): every product type has different attributes,
-- and a table can't have a "screen_size" column that only TVs use.
ALTER TABLE products ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}';

-- Which attributes a category has and how to show them as filters.
-- This is what makes the sidebar different for "tv" vs "t-shirt".
CREATE TABLE IF NOT EXISTS category_attributes (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID         NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  key         VARCHAR(50)  NOT NULL,   -- key inside products.attributes, e.g. "screen_size"
  label       VARCHAR(100) NOT NULL,   -- shown in the sidebar, e.g. "Screen Size"
  type        VARCHAR(20)  NOT NULL CHECK (type IN ('enum', 'number', 'boolean')),
  unit        VARCHAR(20),             -- numbers only, e.g. "in", "GB", "lb"
  buckets     JSONB,                   -- numbers only: filter ranges, e.g. [{"max": 32}, {"min": 32, "max": 50}]
  position    INTEGER      NOT NULL DEFAULT 0, -- order in the sidebar
  UNIQUE (category_id, key)
);
