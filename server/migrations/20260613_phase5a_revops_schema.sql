BEGIN;

-- Add RevOps columns to leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS expected_close_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS stage_duration_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_estimated_deal_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS deal_value_confidence TEXT,
ADD COLUMN IF NOT EXISTS org_type TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS intent_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'On Track',
ADD COLUMN IF NOT EXISTS sla_flagged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

-- Create lead stage history table
CREATE TABLE IF NOT EXISTS public.lead_stage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    previous_stage TEXT,
    new_stage TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    changed_by UUID,
    duration_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_lead_stage_history_lead_id ON public.lead_stage_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_changed_at ON public.lead_stage_history(changed_at);

-- Trigger to set stage_entered_at on before insert/update
CREATE OR REPLACE FUNCTION public.set_lead_stage_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.stage_entered_at := CURRENT_TIMESTAMP;
        NEW.stage_duration_days := 0;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.sales_stage IS DISTINCT FROM NEW.sales_stage THEN
            NEW.stage_entered_at := CURRENT_TIMESTAMP;
            NEW.stage_duration_days := 0;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_lead_stage_timestamps ON public.leads;
CREATE TRIGGER trg_set_lead_stage_timestamps
BEFORE INSERT OR UPDATE OF sales_stage ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.set_lead_stage_timestamps();

-- Trigger to log stage history in AFTER insert/update
CREATE OR REPLACE FUNCTION public.log_lead_stage_history()
RETURNS TRIGGER AS $$
DECLARE
    prev_stage TEXT;
    duration_secs INTEGER := 0;
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.lead_stage_history (
            lead_id,
            previous_stage,
            new_stage,
            changed_at,
            changed_by,
            duration_seconds
        ) VALUES (
            NEW.id,
            NULL,
            COALESCE(NEW.sales_stage, 'New Lead'),
            CURRENT_TIMESTAMP,
            NEW.assigned_to,
            0
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.sales_stage IS DISTINCT FROM NEW.sales_stage THEN
            IF OLD.stage_entered_at IS NOT NULL THEN
                duration_secs := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - OLD.stage_entered_at))::INTEGER;
            END IF;
            
            INSERT INTO public.lead_stage_history (
                lead_id,
                previous_stage,
                new_stage,
                changed_at,
                changed_by,
                duration_seconds
            ) VALUES (
                NEW.id,
                OLD.sales_stage,
                NEW.sales_stage,
                CURRENT_TIMESTAMP,
                NEW.assigned_to,
                duration_secs
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_lead_stage_history ON public.leads;
CREATE TRIGGER trg_log_lead_stage_history
AFTER INSERT OR UPDATE OF sales_stage ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_lead_stage_history();

COMMIT;
