CREATE TABLE IF NOT EXISTS carts (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, -- one cart per user
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
