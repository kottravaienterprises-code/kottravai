-- ====================================================================
-- PHASE 7C-B: Intelligence & Predictive Intervention Engine Schema
-- ====================================================================

-- 1. Predictive Anomalies
-- Logs detected spikes/drops in revenue, pipeline, forecast, etc.
CREATE TABLE IF NOT EXISTS predictive_anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL, -- Pipeline Velocity Drop, Forecast Variance Spike, etc.
    severity VARCHAR(50) NOT NULL, -- Info, Low, Medium, High, Critical
    metric_name VARCHAR(100) NOT NULL,
    expected_value NUMERIC(15,2),
    actual_value NUMERIC(15,2),
    variance_percent NUMERIC(5,2),
    description TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 2. Predictive Signals (Churn & Expansion)
-- AI-driven scoring for individual accounts
CREATE TABLE IF NOT EXISTS predictive_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES customer_accounts(id) ON DELETE CASCADE,
    signal_type VARCHAR(50) NOT NULL, -- 'CHURN' or 'EXPANSION'
    risk_score INTEGER NOT NULL, -- 0-100
    risk_level VARCHAR(50), -- Low, Medium, High, Critical
    confidence INTEGER NOT NULL, -- 0-100 (Explainability)
    drivers JSONB DEFAULT '[]'::jsonb, -- Array of string reasons
    data_sources JSONB DEFAULT '[]'::jsonb, -- Array of sources used
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Predictive Interventions
-- Autonomous recommendations mapped to signals or anomalies
CREATE TABLE IF NOT EXISTS predictive_interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type VARCHAR(50) NOT NULL, -- 'SIGNAL' or 'ANOMALY'
    source_id UUID NOT NULL, -- ID to predictive_signals or predictive_anomalies
    action_type VARCHAR(100) NOT NULL, -- 'Draft Email', 'Create CSM Task', 'Schedule QBR', 'Apply Discount'
    description TEXT,
    confidence INTEGER,
    recommended_playbook VARCHAR(100),
    approval_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'AUTO_APPROVED', 'MANAGER_APPROVED', 'EXECUTIVE_APPROVED', 'REJECTED'
    execution_status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'QUEUED', 'COMPLETED', 'FAILED'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups on signals and interventions
CREATE INDEX IF NOT EXISTS idx_pred_signals_account ON predictive_signals(account_id);
CREATE INDEX IF NOT EXISTS idx_pred_interv_source ON predictive_interventions(source_id);
CREATE INDEX IF NOT EXISTS idx_pred_anomalies_unresolved ON predictive_anomalies(resolved) WHERE resolved = FALSE;
