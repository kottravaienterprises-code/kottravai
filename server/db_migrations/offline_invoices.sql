-- =====================================================================
-- Offline / Manual Invoice — schema migration
-- Idempotent: safe to run multiple times. Also applied automatically at
-- server start-up by runMigrations() in server/index.js.
--
-- Existing website orders are untouched: `source` defaults to 'website'
-- (PostgreSQL 11+ applies the default to existing rows without a rewrite).
-- =====================================================================

-- 1. Order columns -----------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source                VARCHAR(20) NOT NULL DEFAULT 'website';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number        VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_date          TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status        VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method        VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference     VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_paid           DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_server       DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS taxable_amount_server DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cgst_server           DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sgst_server           DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS igst_server           DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_company      VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_gstin        VARCHAR(15);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS place_of_supply       VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address       JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes                 TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by            VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key       VARCHAR(64);

-- 2. Constraints / indexes ---------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_source_check') THEN
        ALTER TABLE orders ADD CONSTRAINT orders_source_check CHECK (source IN ('website', 'offline'));
    END IF;
END $$;

-- Invoice numbers must be globally unique (only offline orders have one today).
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_invoice_number
    ON orders (invoice_number) WHERE invoice_number IS NOT NULL;

-- Duplicate-submission guard for the admin "Save Invoice" action.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_idempotency_key
    ON orders (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_source ON orders (source);

-- 3. Invoice sequence (collision-safe, per series + financial year) -----
CREATE TABLE IF NOT EXISTS invoice_sequences (
    series      VARCHAR(30) NOT NULL,           -- e.g. 'OFF-INV'
    period      VARCHAR(20) NOT NULL,           -- Indian FY, e.g. '2026-27'
    last_value  INTEGER     NOT NULL DEFAULT 0,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (series, period)
);

-- Allocation (executed inside the order transaction):
--   INSERT INTO invoice_sequences (series, period, last_value) VALUES ('OFF-INV', '2026-27', 1)
--   ON CONFLICT (series, period)
--   DO UPDATE SET last_value = invoice_sequences.last_value + 1, updated_at = NOW()
--   RETURNING last_value;
-- The row lock taken by the upsert serialises concurrent admins; a rolled-back
-- transaction does not consume a number.
