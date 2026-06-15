-- Phase 7B: Enterprise Workflow Orchestration & AI Operations
-- Schema for Event Bus, Workflows, Approvals, and SLA Escalations

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. System Events (Event Bus Firehose)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.system_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL, -- e.g., LEAD_WON, RENEWAL_RISK, WORKFLOW_STARTED
    category TEXT NOT NULL CHECK (category IN ('Sales', 'Customer Success', 'Revenue', 'Security', 'Executive', 'System', 'Workflow')),
    source TEXT NOT NULL, -- The service or module that emitted it
    actor TEXT, -- Who/what triggered it (UUID or 'system'/'ai')
    payload JSONB DEFAULT '{}'::jsonb, -- The event data
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_events_type ON public.system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_category ON public.system_events(category);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON public.system_events(created_at);

-- ================================================================
-- 2. Workflow Playbooks (Templates)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.workflow_playbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    trigger_event TEXT, -- The event_type that auto-starts this playbook (if any)
    is_active BOOLEAN DEFAULT true,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of step configurations
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- 3. Workflow Executions (Active/Historical Runs)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playbook_id UUID REFERENCES public.workflow_playbooks(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('Queued', 'Running', 'Waiting Approval', 'Completed', 'Failed', 'Cancelled')),
    context_data JSONB DEFAULT '{}'::jsonb, -- Carries data between steps
    started_by TEXT, -- Actor who initiated
    current_step_index INTEGER DEFAULT 0,
    sla_deadline TIMESTAMPTZ, -- Optional workflow-level SLA
    escalation_level TEXT CHECK (escalation_level IN ('None', 'Warning', 'High', 'Critical')) DEFAULT 'None',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_playbook ON public.workflow_executions(playbook_id);

-- ================================================================
-- 4. Workflow Tasks (Individual Steps within an Execution)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.workflow_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL,
    step_type TEXT NOT NULL CHECK (step_type IN ('TASK', 'APPROVAL', 'EMAIL', 'WAIT', 'CONDITION', 'AI_ACTION', 'EVENT_TRIGGER', 'WEBHOOK')),
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Failed', 'Skipped')),
    assigned_to TEXT, -- UUID of user or 'AI_Sales_Copilot', etc.
    sla_deadline TIMESTAMPTZ, -- Step-level SLA
    escalation_level TEXT CHECK (escalation_level IN ('None', 'Warning', 'High', 'Critical')) DEFAULT 'None',
    output_data JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_execution ON public.workflow_tasks(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON public.workflow_tasks(status);

-- ================================================================
-- 5. Workflow Approvals (Specific tracking for approvals)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.workflow_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.workflow_tasks(id) ON DELETE CASCADE,
    execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
    approver_role TEXT NOT NULL, -- e.g., 'MANAGER', 'VP', 'SUPER_ADMIN'
    approver_id UUID, -- The specific user who approved/rejected
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Timeout')),
    comments TEXT,
    requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_approvals_task ON public.workflow_approvals(task_id);

-- ================================================================
-- 6. AI Operations Trace Log (Audit for AI Actions)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.ai_operations_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.workflow_tasks(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL CHECK (agent_name IN ('Sales Copilot', 'CS Copilot', 'Revenue Copilot', 'Executive Copilot', 'Workflow Copilot')),
    action_type TEXT NOT NULL, -- e.g., 'Draft Email', 'Recommend Action', 'Generate Playbook'
    input_context JSONB DEFAULT '{}'::jsonb,
    output_result JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- 7. Default Seed Data (Sample Playbooks)
-- ================================================================

INSERT INTO public.workflow_playbooks (name, description, trigger_event, steps)
VALUES (
  'Sales to CS Handoff',
  'Automated onboarding flow when a Lead is Won',
  'LEAD_WON',
  '[
    {"type": "TASK", "title": "Create Customer Account", "assignee": "system"},
    {"type": "AI_ACTION", "title": "Draft Welcome Email", "agent": "CS Copilot"},
    {"type": "APPROVAL", "title": "Approve Welcome Email", "required_role": "MANAGER"},
    {"type": "EMAIL", "title": "Send Welcome Email", "template": "onboarding_welcome"},
    {"type": "TASK", "title": "Assign CSM", "assignee": "MANAGER"}
  ]'::jsonb
) ON CONFLICT (name) DO NOTHING;

INSERT INTO public.workflow_playbooks (name, description, trigger_event, steps)
VALUES (
  'Revenue Recovery Escalation',
  'Triggered when an account health drops to Critical or SLA breaches',
  'CHURN_RISK_HIGH',
  '[
    {"type": "AI_ACTION", "title": "Analyze Risk Factors", "agent": "Revenue Copilot"},
    {"type": "APPROVAL", "title": "Director Approval for Discount", "required_role": "MANAGER"},
    {"type": "TASK", "title": "Execute Recovery Play", "assignee": "CSM"}
  ]'::jsonb
) ON CONFLICT (name) DO NOTHING;
