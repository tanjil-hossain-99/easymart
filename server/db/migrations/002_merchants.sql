CREATE TABLE IF NOT EXISTS merchants (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  url         VARCHAR(500),
  details     TEXT,
  logo_url    VARCHAR(500),
  image_url   VARCHAR(500),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
