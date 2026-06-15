-- 20260630_phase9b_agent_telemetry.sql

CREATE TABLE IF NOT EXISTS public.agent_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    saga_id UUID,
    agent_id VARCHAR(100) NOT NULL,
    agent_role VARCHAR(100) NOT NULL,
    action_type VARCHAR(100) NOT NULL, -- e.g., STATE_CHANGE, TOOL_INVOCATION, THOUGHT, ERROR
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    duration_ms INTEGER,
    token_consumption INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS agent_telemetry_saga_idx ON public.agent_telemetry(saga_id);
CREATE INDEX IF NOT EXISTS agent_telemetry_agent_idx ON public.agent_telemetry(agent_id);

-- Also create a table for Swarm Agent Lifecycle tracking
CREATE TABLE IF NOT EXISTS public.swarm_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    saga_id UUID NOT NULL,
    agent_id VARCHAR(100) NOT NULL UNIQUE,
    agent_role VARCHAR(100) NOT NULL,
    current_state VARCHAR(50) NOT NULL, -- CREATED, READY, THINKING, WAITING_FOR_CONTEXT, DEBATING, CONSENSUS_REACHED, ESCALATED, TERMINATED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION phase9b_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_swarm_agents_updated_at ON public.swarm_agents;
CREATE TRIGGER trg_swarm_agents_updated_at
BEFORE UPDATE ON public.swarm_agents
FOR EACH ROW EXECUTE FUNCTION phase9b_set_timestamp();
