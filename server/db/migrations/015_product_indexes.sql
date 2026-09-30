CREATE INDEX IF NOT EXISTS idx_products_price          ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_category       ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_category_price ON products(category_id, price);
