-- Migration Script: Phase 5C Business Intelligence Schema
BEGIN;

-- 1. Create BI Dashboards table
CREATE TABLE IF NOT EXISTS public.bi_dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by_username TEXT NOT NULL DEFAULT 'system',
    is_default BOOLEAN DEFAULT false,
    layout JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create BI Widgets table
CREATE TABLE IF NOT EXISTS public.bi_widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES public.bi_dashboards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'bar', 'line', 'pie', 'funnel', 'kpi', 'table'
    metric TEXT NOT NULL, -- 'lead_count', 'deal_value', 'velocity', 'win_rate'
    query_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Details: groupBy, dateRange, filters
    layout_config JSONB DEFAULT '{}'::jsonb, -- Grid placement: w, h, x, y
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bi_widgets_dashboard_id ON public.bi_widgets(dashboard_id);

-- 3. Seed Default Dashboard: "Executive Revenue Overview"
INSERT INTO public.bi_dashboards (id, title, description, created_by_username, is_default, layout)
VALUES (
    'd0000000-0000-0000-0000-000000000000',
    'Executive Revenue Overview',
    'Pre-configured pipeline metrics, velocity trackers, and industry conversions.',
    'system',
    true,
    '[
        {"i": "w1", "x": 0, "y": 0, "w": 6, "h": 4},
        {"i": "w2", "x": 6, "y": 0, "w": 6, "h": 4},
        {"i": "w3", "x": 0, "y": 4, "w": 6, "h": 4},
        {"i": "w4", "x": 6, "y": 4, "w": 6, "h": 4}
    ]'::jsonb
)
ON CONFLICT (id) DO UPDATE 
SET title = EXCLUDED.title, description = EXCLUDED.description, layout = EXCLUDED.layout;

-- 4. Seed Default Widgets
-- Widget 1: Monthly Leads Count
INSERT INTO public.bi_widgets (id, dashboard_id, title, type, metric, query_config, layout_config)
VALUES (
    'e1000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000000',
    'Monthly Leads Count',
    'bar',
    'lead_count',
    '{"groupBy": "created_month", "dateRange": "last_12_months"}'::jsonb,
    '{"x": 0, "y": 0, "w": 6, "h": 4}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Widget 2: Pipeline Value by Lead Source
INSERT INTO public.bi_widgets (id, dashboard_id, title, type, metric, query_config, layout_config)
VALUES (
    'e2000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000000',
    'Pipeline Value by Lead Source',
    'pie',
    'deal_value',
    '{"groupBy": "lead_source", "dateRange": "all"}'::jsonb,
    '{"x": 6, "y": 0, "w": 6, "h": 4}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Widget 3: Win/Loss Analysis by Industry
INSERT INTO public.bi_widgets (id, dashboard_id, title, type, metric, query_config, layout_config)
VALUES (
    'e3000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000000',
    'Win/Loss Analysis by Industry',
    'bar',
    'win_rate',
    '{"groupBy": "industry", "dateRange": "all"}'::jsonb,
    '{"x": 0, "y": 4, "w": 6, "h": 4}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Widget 4: Average Stage Velocity
INSERT INTO public.bi_widgets (id, dashboard_id, title, type, metric, query_config, layout_config)
VALUES (
    'e4000000-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000000',
    'Average Stage Velocity',
    'kpi',
    'velocity',
    '{"groupBy": "sales_stage", "dateRange": "all"}'::jsonb,
    '{"x": 6, "y": 4, "w": 6, "h": 4}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
