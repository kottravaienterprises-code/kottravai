-- 20260620_phase8c_saga_orchestrator.sql

-- Saga Instances Table
CREATE TABLE IF NOT EXISTS public.saga_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saga_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'STARTED', -- STARTED, PENDING_APPROVAL, EXECUTING, COMPLETED, COMPENSATING, FAILED, RESOLVED_MANUALLY
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_simulation BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Generative Action Audits
CREATE TABLE IF NOT EXISTS public.generative_action_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saga_id UUID REFERENCES public.saga_instances(id) ON DELETE CASCADE,
    trigger_event_id VARCHAR(100),
    action_type VARCHAR(100) NOT NULL,
    ai_reasoning_summary TEXT,
    proposed_action JSONB NOT NULL,
    confidence_score NUMERIC(5, 2), -- 0.00 to 100.00
    approval_status VARCHAR(50) DEFAULT 'AUTO_APPROVED', -- AUTO_APPROVED, PENDING_HUMAN, HUMAN_APPROVED, HUMAN_REJECTED
    execution_result VARCHAR(50) DEFAULT 'PENDING', -- SUCCESS, FAILED, COMPENSATED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION phase8c_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_saga_inst_updated_at ON public.saga_instances;
CREATE TRIGGER trg_saga_inst_updated_at
BEFORE UPDATE ON public.saga_instances
FOR EACH ROW EXECUTE FUNCTION phase8c_set_timestamp();

DROP TRIGGER IF EXISTS trg_gen_audit_updated_at ON public.generative_action_audits;
CREATE TRIGGER trg_gen_audit_updated_at
BEFORE UPDATE ON public.generative_action_audits
FOR EACH ROW EXECUTE FUNCTION phase8c_set_timestamp();
