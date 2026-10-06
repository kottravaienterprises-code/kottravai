-- Migration: Offline Invoice Foundation
-- Description: Adds offline invoice fields to orders table, creates invoice_sequences table, and atomic sequence function.

-- 1. Add Offline Invoice Columns to orders table
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'website',
    ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100) UNIQUE,
    ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_server NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS taxable_amount_server NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cgst_server NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_server NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_server NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS customer_company TEXT,
    ADD COLUMN IF NOT EXISTS customer_gstin VARCHAR(50),
    ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(100),
    ADD COLUMN IF NOT EXISTS billing_address TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_by TEXT,
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) UNIQUE;

-- 2. Preserve existing orders by setting source = 'website' where null
UPDATE orders
SET source = 'website'
WHERE source IS NULL;

-- 3. Create invoice_sequences table
CREATE TABLE IF NOT EXISTS invoice_sequences (
    financial_year VARCHAR(10) PRIMARY KEY,
    last_sequence INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create atomic PostgreSQL function for generating sequence numbers safely under concurrency
CREATE OR REPLACE FUNCTION get_next_offline_invoice_number(p_fy VARCHAR)
RETURNS TEXT AS $$
DECLARE
    next_val INT;
BEGIN
    INSERT INTO invoice_sequences (financial_year, last_sequence, updated_at)
    VALUES (p_fy, 1, NOW())
    ON CONFLICT (financial_year)
    DO UPDATE SET last_sequence = invoice_sequences.last_sequence + 1, updated_at = NOW()
    RETURNING last_sequence INTO next_val;

    RETURN 'OFF-INV-' || p_fy || '-' || LPAD(next_val::text, 4, '0');
END;
$$ LANGUAGE plpgsql;
