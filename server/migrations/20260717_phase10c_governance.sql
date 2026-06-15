-- 20260717_phase10c_governance.sql
-- Phase 10C: Autonomous Policy Refinement & Governance Optimization

-- ── Governance Recommendations ─────────────────────────────────────────────
-- GovernanceAgent writes here. Only humans can advance status beyond PENDING.
CREATE TABLE IF NOT EXISTS public.governance_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    -- THRESHOLD_ADJUSTMENT | RBAC_CHANGE | AGENT_WEIGHT_CAP | ESCALATION_POLICY
    target_domain VARCHAR(50),         -- e.g. Pricing, Retention
    target_role VARCHAR(100),          -- e.g. FINANCE_AGENT (optional)
    current_value JSONB NOT NULL,      -- snapshot of what exists today
    proposed_value JSONB NOT NULL,     -- what the GovernanceAgent recommends
    rationale TEXT NOT NULL,           -- evidence-based explanation
    evidence JSONB DEFAULT '[]',       -- supporting trend / correlation data
    simulation_id UUID,                -- FK to policy_simulations (populated after simulation)
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    -- PENDING | SIMULATED | AWAITING_APPROVAL | APPROVED | REJECTED | ROLLED_BACK
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Policy Simulations ─────────────────────────────────────────────────────
-- Sandboxed replay of historical decisions under the proposed policy.
CREATE TABLE IF NOT EXISTS public.policy_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    recommendation_id UUID NOT NULL,
    decisions_replayed INTEGER DEFAULT 0,
    outcomes_matched INTEGER DEFAULT 0,
    baseline_success_rate NUMERIC(5,2),   -- success rate under current policy
    simulated_success_rate NUMERIC(5,2),  -- projected success rate under proposal
    improvement_pct NUMERIC(5,2),         -- (simulated - baseline) / baseline * 100
    simulation_report JSONB DEFAULT '{}', -- per-decision breakdown
    status VARCHAR(20) NOT NULL DEFAULT 'RUNNING', -- RUNNING | COMPLETE | FAILED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Governance Approval Audit ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.governance_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    recommendation_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,  -- APPROVED | REJECTED | ROLLED_BACK
    actor VARCHAR(100) NOT NULL,
    reason TEXT,
    snapshot_before JSONB,        -- policy state before change
    snapshot_after JSONB,         -- policy state after change (null for REJECTED)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS gov_recs_tenant_status_idx
    ON public.governance_recommendations(tenant_id, status);
CREATE INDEX IF NOT EXISTS gov_sims_rec_idx
    ON public.policy_simulations(recommendation_id);
CREATE INDEX IF NOT EXISTS gov_approvals_rec_idx
    ON public.governance_approvals(recommendation_id);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION phase10c_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gov_recs_ts   ON public.governance_recommendations;
CREATE TRIGGER trg_gov_recs_ts
  BEFORE UPDATE ON public.governance_recommendations
  FOR EACH ROW EXECUTE FUNCTION phase10c_set_timestamp();

DROP TRIGGER IF EXISTS trg_gov_sims_ts   ON public.policy_simulations;
CREATE TRIGGER trg_gov_sims_ts
  BEFORE UPDATE ON public.policy_simulations
  FOR EACH ROW EXECUTE FUNCTION phase10c_set_timestamp();
