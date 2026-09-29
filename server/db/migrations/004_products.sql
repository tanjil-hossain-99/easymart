CREATE TABLE IF NOT EXISTS products (
  id                UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  title             VARCHAR(500)   NOT NULL,
  description       TEXT,
  price             NUMERIC(10, 2) NOT NULL,   -- NUMERIC not FLOAT: exact decimal for money
  discount          NUMERIC(5, 2)  NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 100), -- percentage e.g. 10.00 = 10% off
  merchant_id       UUID           NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  category_id       UUID           NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  stripe_product_id VARCHAR(255),              -- Stripe's product ID (set when synced to Stripe)
  stripe_price_id   VARCHAR(255),              -- Stripe's price ID (set when synced to Stripe)
  is_active         BOOLEAN        NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
