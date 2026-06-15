-- Migration: Phase 4 Pipeline Analytics & Revenue Forecasting
-- Description: Adds deal value, forecast revenue, sales stage, and close timestamps to the leads table.

BEGIN;

-- 1. Add new columns to the leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS estimated_deal_value DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_probability INTEGER DEFAULT 0 CHECK (conversion_probability >= 0 AND conversion_probability <= 100),
ADD COLUMN IF NOT EXISTS forecast_revenue DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS closed_won_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS closed_lost_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sales_stage TEXT DEFAULT 'New Lead';

-- 2. Backfill existing sales_stage based on the old status column
UPDATE public.leads
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

-- 3. Create a constraint to enforce valid sales stages going forward
ALTER TABLE public.leads
ADD CONSTRAINT leads_sales_stage_check 
CHECK (sales_stage IN (
    'New Lead', 
    'Qualified', 
    'Contacted', 
    'Proposal Sent', 
    'Negotiation', 
    'Closed Won', 
    'Closed Lost'
));

-- 4. Create indexes to speed up the pipeline dashboards
CREATE INDEX IF NOT EXISTS idx_leads_sales_stage ON public.leads(sales_stage);
CREATE INDEX IF NOT EXISTS idx_leads_closed_won_at ON public.leads(closed_won_at);
CREATE INDEX IF NOT EXISTS idx_leads_estimated_deal_value ON public.leads(estimated_deal_value);

-- 5. Add a Trigger to auto-calculate forecast_revenue on insert or update
-- Formula: estimated_deal_value * (conversion_probability / 100)
-- Wait, conversion_probability is part of AI score? The prompt says "conversion_probability". 
-- In the leads table we have lead_score, or does lead_ai_analysis have it? 
-- Let's just create the columns. We can handle calculation in the Node server as requested.

COMMIT;
