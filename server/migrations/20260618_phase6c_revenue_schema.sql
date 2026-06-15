-- Phase 6C: Unified Revenue Intelligence Schema
-- Creates revenue_snapshots for historical tracking and forecast accuracy

CREATE TABLE IF NOT EXISTS public.revenue_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    arr NUMERIC(15, 2) DEFAULT 0,
    mrr NUMERIC(15, 2) DEFAULT 0,
    nrr NUMERIC(5, 2) DEFAULT 0,
    grr NUMERIC(5, 2) DEFAULT 0,
    pipeline_forecast NUMERIC(15, 2) DEFAULT 0,
    renewal_forecast NUMERIC(15, 2) DEFAULT 0,
    expansion_forecast NUMERIC(15, 2) DEFAULT 0,
    expected_churn NUMERIC(15, 2) DEFAULT 0,
    unified_forecast NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure only one snapshot per day is stored (to prevent duplicates if sweep runs multiple times)
CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_snapshots_date ON public.revenue_snapshots(snapshot_date);

-- Add expansion revenue to upsell opportunities if not already tracked explicitly
ALTER TABLE public.upsell_opportunities 
ADD COLUMN IF NOT EXISTS expansion_arr NUMERIC(15, 2) GENERATED ALWAYS AS (estimated_value) STORED;
