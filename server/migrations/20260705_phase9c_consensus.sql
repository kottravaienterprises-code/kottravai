-- 20260705_phase9c_consensus.sql

CREATE TABLE IF NOT EXISTS public.swarm_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    saga_id UUID NOT NULL,
    state VARCHAR(50) NOT NULL, -- PROPOSED, CHALLENGED, REVISED, CONSENSUS_REACHED, ESCALATED_TO_HUMAN, APPROVED, REJECTED, EXECUTED
    confidence_score NUMERIC(5,2),
    final_recommendation JSONB,
    minority_opinions JSONB DEFAULT '[]'::jsonb,
    human_override BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS swarm_decisions_saga_idx ON public.swarm_decisions(saga_id);

CREATE OR REPLACE FUNCTION phase9c_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_swarm_decisions_updated_at ON public.swarm_decisions;
CREATE TRIGGER trg_swarm_decisions_updated_at
BEFORE UPDATE ON public.swarm_decisions
FOR EACH ROW EXECUTE FUNCTION phase9c_set_timestamp();
