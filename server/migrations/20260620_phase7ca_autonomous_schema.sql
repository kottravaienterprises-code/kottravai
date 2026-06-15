-- ====================================================================
-- PHASE 7C-A: Autonomous Revenue Operations & Executive Command Schema
-- ====================================================================

-- 1. Autonomous Thresholds Table
-- Defines operational limits for AI agents and automated workflows
CREATE TABLE IF NOT EXISTS autonomous_thresholds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'DISCOUNT', 'RENEWAL_OFFER'
    max_discount_percent NUMERIC(5,2) DEFAULT 0.00,
    max_arr_impact NUMERIC(12,2) DEFAULT 0.00,
    min_confidence NUMERIC(5,2) DEFAULT 90.00,
    approval_required BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial autonomous thresholds based on approved Phase 7C-A policy
INSERT INTO autonomous_thresholds (action_type, max_discount_percent, max_arr_impact, min_confidence, approval_required)
VALUES 
    ('DISCOUNT_AUTO', 4.99, 1000.00, 90.00, FALSE),         -- <= 4.99% is fully autonomous
    ('DISCOUNT_MANAGER', 10.00, 5000.00, 75.00, TRUE),      -- 5% to 10% requires Manager
    ('DISCOUNT_EXECUTIVE', 100.00, 999999.00, 50.00, TRUE), -- > 10% requires Executive
    ('RENEWAL_AUTO', 0.00, 5000.00, 90.00, FALSE),          -- Standard renewals under $5k
    ('CHURN_RECOVERY', 5.00, 2000.00, 85.00, TRUE)          -- Churn recovery incentives (Approval gated)
ON CONFLICT (action_type) DO NOTHING;

-- 2. Executive Commands Log
-- Audit trail for all natural language prompts submitted to the Executive Command Layer
CREATE TABLE IF NOT EXISTS executive_commands_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL, -- Admin ID
    role VARCHAR(50) NOT NULL,
    prompt TEXT NOT NULL,
    parsed_intent VARCHAR(100),
    services_invoked JSONB DEFAULT '[]'::jsonb,
    actions_triggered JSONB DEFAULT '[]'::jsonb,
    approval_required BOOLEAN DEFAULT FALSE,
    execution_outcome TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Update Workflow Playbooks to track autonomy boundaries
ALTER TABLE workflow_playbooks ADD COLUMN IF NOT EXISTS autonomy_level VARCHAR(50) DEFAULT 'APPROVAL_GATED';

-- Pre-approve specific playbooks based on user mandate
UPDATE workflow_playbooks SET autonomy_level = 'FULL_AUTONOMY' WHERE name IN (
    'Sales to CS Handoff',
    'Renewal Reminder Automation',
    'Customer Health Monitoring',
    'SLA Escalation Routing',
    'Executive Digest Generation',
    'Workflow Retry & Recovery',
    'Expansion Opportunity Detection',
    'Churn Risk Detection'
);
