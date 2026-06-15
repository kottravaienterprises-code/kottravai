-- Migration Script: Phase 6A Customer Success & Account Intelligence
BEGIN;

-- 1. Create Customer Accounts table
CREATE TABLE IF NOT EXISTS public.customer_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID UNIQUE REFERENCES public.leads(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    assigned_csm UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('Onboarding', 'Active', 'Stale', 'Churned')) DEFAULT 'Onboarding',
    health_score INTEGER NOT NULL DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
    health_status TEXT CHECK (health_status IN ('Healthy', 'At Risk', 'Critical')) DEFAULT 'Healthy',
    mrr DECIMAL(12,2) DEFAULT 0.00,
    arr DECIMAL(12,2) DEFAULT 0.00,
    contract_start_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    contract_end_date TIMESTAMPTZ NOT NULL,
    last_activity_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    support_tickets_count INTEGER DEFAULT 0,
    nps_score INTEGER CHECK (nps_score IS NULL OR (nps_score >= 0 AND nps_score <= 10)),
    usage_rate INTEGER DEFAULT 100 CHECK (usage_rate >= 0 AND usage_rate <= 100),
    churn_probability INTEGER DEFAULT 0 CHECK (churn_probability >= 0 AND churn_probability <= 100),
    support_integration_source TEXT CHECK (support_integration_source IN ('zoho_desk', 'freshdesk', 'jira') OR support_integration_source IS NULL),
    external_support_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_accounts_status ON public.customer_accounts(status);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_health ON public.customer_accounts(health_status);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_csm ON public.customer_accounts(assigned_csm);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_contract_end ON public.customer_accounts(contract_end_date);

-- 2. Create Account Health History table
CREATE TABLE IF NOT EXISTS public.account_health_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_health_history_account ON public.account_health_history(account_id);

-- 3. Create Upsell Opportunities table
CREATE TABLE IF NOT EXISTS public.upsell_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    estimated_value DECIMAL(12,2) NOT NULL,
    status TEXT CHECK (status IN ('Identified', 'Contacted', 'Proposal Sent', 'Won', 'Lost')) DEFAULT 'Identified',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_upsell_opps_account ON public.upsell_opportunities(account_id);

-- 4. Trigger to automatically spawn Customer Account on lead Closed Won stage
CREATE OR REPLACE FUNCTION public.create_customer_account_on_won()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sales_stage = 'Closed Won' AND (OLD.sales_stage IS DISTINCT FROM 'Closed Won' OR TG_OP = 'INSERT') THEN
        INSERT INTO public.customer_accounts (
            lead_id, company_name, contact_name, contact_email, assigned_csm, 
            status, mrr, arr, contract_start_date, contract_end_date, last_activity_date
        ) VALUES (
            NEW.id,
            COALESCE(NEW.org_type || ' - ' || NEW.name, NEW.name),
            NEW.name,
            NEW.email,
            NEW.assigned_to,
            'Onboarding',
            COALESCE(NEW.final_deal_value / 12.0, NEW.estimated_deal_value / 12.0, 0.0),
            COALESCE(NEW.final_deal_value, NEW.estimated_deal_value, 0.0),
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP + INTERVAL '12 months',
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (lead_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_customer_account_on_won ON public.leads;
CREATE TRIGGER trg_create_customer_account_on_won
AFTER UPDATE OF sales_stage ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.create_customer_account_on_won();

COMMIT;
