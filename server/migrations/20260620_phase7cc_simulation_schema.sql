-- Phase 7C-C: Simulation & Strategic Planning Schema

CREATE TABLE IF NOT EXISTS public.revenue_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.users(id),
    variables JSONB NOT NULL DEFAULT '{}',
    projection_results JSONB NOT NULL DEFAULT '{}',
    ai_analysis JSONB,
    status VARCHAR(50) DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revenue_scenarios_status ON public.revenue_scenarios(status);

-- Support triggers for updated_at
CREATE OR REPLACE FUNCTION phase7cc_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_revenue_scenarios') THEN
        CREATE TRIGGER set_timestamp_revenue_scenarios
        BEFORE UPDATE ON public.revenue_scenarios
        FOR EACH ROW
        EXECUTE FUNCTION phase7cc_set_timestamp();
    END IF;
END $$;
