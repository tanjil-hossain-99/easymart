CREATE TABLE IF NOT EXISTS categories (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL UNIQUE,
  parent_id   UUID         REFERENCES categories(id) ON DELETE SET NULL,  -- null = top-level category
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
