CREATE TABLE IF NOT EXISTS addresses (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name     VARCHAR(255)  NOT NULL,
  line1         VARCHAR(255)  NOT NULL,
  line2         VARCHAR(255),
  city          VARCHAR(100)  NOT NULL,
  state         VARCHAR(100)  NOT NULL,
  postal_code   VARCHAR(20)   NOT NULL,
  country       VARCHAR(100)  NOT NULL DEFAULT 'Bangladesh',
  is_default    BOOLEAN       NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_name        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_line1       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_line2       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_city        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS shipping_state       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS shipping_postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS shipping_country     VARCHAR(100);
