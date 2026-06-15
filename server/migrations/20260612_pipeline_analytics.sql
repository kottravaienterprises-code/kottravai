BEGIN;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS estimated_deal_value DECIMAL(12,2);

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS forecast_revenue DECIMAL(12,2);

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS closed_won_at TIMESTAMPTZ;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS closed_lost_at TIMESTAMPTZ;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS sales_stage TEXT DEFAULT 'New Lead';

-- Backfill existing sales_stage based on the status column
UPDATE leads
SET sales_stage = CASE
    WHEN status = 'new' THEN 'New Lead'
    WHEN status = 'contacted' THEN 'Contacted'
    WHEN status = 'qualified' THEN 'Qualified'
    WHEN status = 'proposal_sent' THEN 'Proposal Sent'
    WHEN status = 'negotiation' THEN 'Negotiation'
    WHEN status = 'won' THEN 'Closed Won'
    WHEN status = 'lost' THEN 'Closed Lost'
    ELSE 'New Lead'
END
WHERE sales_stage = 'New Lead' AND status IS NOT NULL;

COMMIT;
