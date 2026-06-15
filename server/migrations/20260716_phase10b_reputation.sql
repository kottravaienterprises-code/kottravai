-- 20260716_phase10b_reputation.sql

CREATE TABLE IF NOT EXISTS public.agent_reputations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    agent_role VARCHAR(100) NOT NULL,
    domain VARCHAR(50) NOT NULL,
    reputation_score NUMERIC(5,2) NOT NULL DEFAULT 50.00,
    total_evaluations INTEGER DEFAULT 0,
    successful_predictions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, agent_role, domain)
);

CREATE TABLE IF NOT EXISTS public.agent_reputation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    agent_role VARCHAR(100) NOT NULL,
    domain VARCHAR(50) NOT NULL,
    old_score NUMERIC(5,2) NOT NULL,
    new_score NUMERIC(5,2) NOT NULL,
    reason TEXT NOT NULL,
    outcome_id UUID,
    explainability JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS agent_reputations_role_domain_idx ON public.agent_reputations(tenant_id, agent_role, domain);
CREATE INDEX IF NOT EXISTS agent_reputation_history_role_idx ON public.agent_reputation_history(tenant_id, agent_role);

CREATE OR REPLACE FUNCTION phase10b_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_reputations_updated_at ON public.agent_reputations;
CREATE TRIGGER trg_agent_reputations_updated_at
BEFORE UPDATE ON public.agent_reputations
FOR EACH ROW EXECUTE FUNCTION phase10b_set_timestamp();
