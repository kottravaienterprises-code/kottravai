BEGIN;

-- Trigger Function to update timestamps and calculate forecast_revenue
CREATE OR REPLACE FUNCTION public.update_lead_pipeline_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Update timestamps and conversion probabilities based on sales_stage
    IF TG_OP = 'INSERT' THEN
        IF NEW.sales_stage = 'Closed Won' THEN
            NEW.closed_won_at = NOW();
            NEW.conversion_probability = 100;
        ELSIF NEW.sales_stage = 'Closed Lost' THEN
            NEW.closed_lost_at = NOW();
            NEW.conversion_probability = 0;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.sales_stage = 'Closed Won' AND (OLD.sales_stage IS NULL OR OLD.sales_stage != 'Closed Won') THEN
            NEW.closed_won_at = NOW();
            NEW.conversion_probability = 100;
        ELSIF NEW.sales_stage = 'Closed Lost' AND (OLD.sales_stage IS NULL OR OLD.sales_stage != 'Closed Lost') THEN
            NEW.closed_lost_at = NOW();
            NEW.conversion_probability = 0;
        END IF;
    END IF;

    -- Calculate forecast_revenue
    IF NEW.estimated_deal_value IS NOT NULL AND NEW.conversion_probability IS NOT NULL THEN
        NEW.forecast_revenue = NEW.estimated_deal_value * (NEW.conversion_probability::numeric / 100.0);
    ELSE
        NEW.forecast_revenue = 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_update_lead_pipeline_fields ON public.leads;

-- Create the trigger
CREATE TRIGGER trg_update_lead_pipeline_fields
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_lead_pipeline_fields();

-- Update all existing rows to trigger the recalculation for forecast_revenue
UPDATE public.leads SET id = id;

COMMIT;
