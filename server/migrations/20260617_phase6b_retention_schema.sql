-- Phase 6B: Customer Retention, Expansion Revenue & Lifecycle Automation

-- 1. Add new columns to existing customer_accounts table
ALTER TABLE public.customer_accounts
ADD COLUMN IF NOT EXISTS health_velocity NUMERIC(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS health_trend VARCHAR(20) DEFAULT 'Stable',
ADD COLUMN IF NOT EXISTS risk_change_detected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expansion_score NUMERIC(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS renewal_probability NUMERIC(5,2) DEFAULT 80.0,
ADD COLUMN IF NOT EXISTS renewal_forecast_value NUMERIC(15,2) DEFAULT 0.0;

-- 2. Customer Journey Events
CREATE TABLE IF NOT EXISTS public.customer_journey_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
    milestone_name VARCHAR(100) NOT NULL, -- e.g., 'Account Created', 'Kickoff Completed', 'First Login', 'First Value Achieved', 'Training Completed', 'Active Adoption'
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_journey_events_account ON public.customer_journey_events(account_id);
CREATE INDEX IF NOT EXISTS idx_journey_events_milestone ON public.customer_journey_events(milestone_name);

-- 3. Renewal Forecasts (Historical snapshots)
CREATE TABLE IF NOT EXISTS public.renewal_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
    forecast_month DATE NOT NULL, -- e.g., '2026-06-01'
    renewal_probability NUMERIC(5,2) NOT NULL,
    forecast_revenue NUMERIC(15,2) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_renewal_forecasts_month ON public.renewal_forecasts(forecast_month);
CREATE INDEX IF NOT EXISTS idx_renewal_forecasts_account ON public.renewal_forecasts(account_id);

-- 4. Renewal Playbooks
CREATE TABLE IF NOT EXISTS public.renewal_playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
    playbook_content JSONB NOT NULL, -- structured AI generated brief
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Draft' -- Draft, Approved, Executed
);
CREATE INDEX IF NOT EXISTS idx_renewal_playbooks_account ON public.renewal_playbooks(account_id);

-- 5. Expansion Recommendations
CREATE TABLE IF NOT EXISTS public.expansion_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(100) NOT NULL, -- Upsell, Cross-sell
    product_category VARCHAR(100),
    confidence_score NUMERIC(5,2),
    rationale TEXT,
    suggested_value NUMERIC(15,2),
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Actioned, Dismissed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expansion_recs_account ON public.expansion_recommendations(account_id);

-- 6. Churn Risk Escalations
CREATE TABLE IF NOT EXISTS public.churn_risk_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
    risk_level VARCHAR(50) NOT NULL, -- At Risk, Critical
    trigger_reason TEXT,
    health_score_at_trigger INTEGER,
    health_velocity_at_trigger NUMERIC(5,2),
    status VARCHAR(50) DEFAULT 'Open', -- Open, Investigating, Resolved, Churned
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_churn_escalations_account ON public.churn_risk_escalations(account_id);
CREATE INDEX IF NOT EXISTS idx_churn_escalations_status ON public.churn_risk_escalations(status);

-- 7. Customer Tasks (for CS Workflows)
CREATE TABLE IF NOT EXISTS public.customer_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    task_type VARCHAR(100) NOT NULL, -- 'Renewal Prep', 'Onboarding Milestone', 'Risk Mitigation'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, In Progress, Completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_customer_tasks_account ON public.customer_tasks(account_id);
CREATE INDEX IF NOT EXISTS idx_customer_tasks_assignee ON public.customer_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customer_tasks_status ON public.customer_tasks(status);
