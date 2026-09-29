CREATE TABLE IF NOT EXISTS orders (
  id                      UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status                  VARCHAR(20)    NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  total_amount            NUMERIC(10, 2) NOT NULL,
  stripe_payment_intent_id VARCHAR(255)  UNIQUE,  -- set when Stripe PaymentIntent is created
  idempotency_key         VARCHAR(255)   UNIQUE,  -- prevents duplicate orders (Phase 5)
  created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
