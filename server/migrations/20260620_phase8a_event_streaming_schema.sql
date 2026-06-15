-- 20260620_phase8a_event_streaming_schema.sql
-- Creates the event audit logs and DLQ tables for the Event Streaming Architecture

CREATE TABLE IF NOT EXISTS public.event_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(100) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    tenant_id VARCHAR(100),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'PUBLISHED', -- PUBLISHED, PROCESSED, FAILED, DEAD_LETTER
    retry_count INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_audit_event_id ON public.event_audit_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_audit_status ON public.event_audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_event_audit_type ON public.event_audit_logs(event_type);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION phase8a_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_audit_updated_at ON public.event_audit_logs;
CREATE TRIGGER trg_event_audit_updated_at
BEFORE UPDATE ON public.event_audit_logs
FOR EACH ROW
EXECUTE FUNCTION phase8a_set_timestamp();
