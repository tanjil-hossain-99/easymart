CREATE TABLE IF NOT EXISTS payments (
  id                      UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id                UUID           NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  stripe_payment_intent_id VARCHAR(255)  NOT NULL UNIQUE,
  amount                  NUMERIC(10, 2) NOT NULL,
  currency                VARCHAR(10)    NOT NULL DEFAULT 'usd',
  status                  VARCHAR(20)    NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'succeeded', 'failed')),
  created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
