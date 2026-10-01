-- Add "confirmed" status for Cash on Delivery orders (placed but not yet paid).
-- Drop and recreate the inline check constraint with the new value included.
DO $$
BEGIN
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'paid', 'shipped', 'cancelled'));

-- Track how the order was paid (or will be paid for COD).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(10) NOT NULL DEFAULT 'stripe'
  CHECK (payment_method IN ('stripe', 'cod'));
