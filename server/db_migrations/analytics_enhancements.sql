-- PostgreSQL Analytics Enhancements Migration
-- Adds missing fields to the analytics_events table safely.

ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS is_logged_in BOOLEAN DEFAULT false;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS products_array JSONB;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(255);
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS discount_applied NUMERIC;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS taxes NUMERIC;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS sku VARCHAR(255);
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS stock_status VARCHAR(50);
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS cart_total_value NUMERIC;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS first_utm_content VARCHAR(500);
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS first_utm_term VARCHAR(500);
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS session_utm_content VARCHAR(500);
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS session_utm_term VARCHAR(500);
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS gclid VARCHAR(500);
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS fbclid VARCHAR(500);
