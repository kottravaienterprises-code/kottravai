-- 20260715_phase10a_outcomes.sql

CREATE TABLE IF NOT EXISTS public.decision_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    saga_id UUID NOT NULL UNIQUE,
    domain VARCHAR(50) NOT NULL, -- Pricing, Retention, Operational, Contract
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, UNDER_EVALUATION, FINALIZED
    classification VARCHAR(50) DEFAULT 'INCONCLUSIVE', -- SUCCESS, FAILURE, PARTIAL_SUCCESS, NEUTRAL, INCONCLUSIVE
    outcome_score NUMERIC(5,2) DEFAULT 0, -- -100 to +100
    correlation_method VARCHAR(50), -- DIRECT_SAGA, EKG_MATCH, MANUAL_REVIEW
    correlation_confidence VARCHAR(20), -- HIGH, MEDIUM, LOW
    evidence JSONB DEFAULT '[]'::jsonb, -- Array of outcome events
    attribution_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS decision_outcomes_saga_idx ON public.decision_outcomes(saga_id);
CREATE INDEX IF NOT EXISTS decision_outcomes_status_idx ON public.decision_outcomes(status) WHERE status != 'FINALIZED';

CREATE OR REPLACE FUNCTION phase10a_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decision_outcomes_updated_at ON public.decision_outcomes;
CREATE TRIGGER trg_decision_outcomes_updated_at
BEFORE UPDATE ON public.decision_outcomes
FOR EACH ROW EXECUTE FUNCTION phase10a_set_timestamp();
