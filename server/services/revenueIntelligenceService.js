/**
 * revenueIntelligenceService.js
 * Phase 6C: Unified Revenue Intelligence Layer
 * 
 * Aggregates data ONLY from existing services — csService, revOpsService,
 * and direct DB queries for pipeline. Does NOT duplicate business logic.
 */
const db = require('../db');
const csService = require('./csService');

// ─────────────────────────────────────────────
// RBAC Helper: scope accounts to team if MANAGER
// ─────────────────────────────────────────────
const getTeamFilter = (req) => {
  if (req && req.adminRole === 'MANAGER' && req.adminUser?.team) {
    return req.adminUser.team;
  }
  return null;
};

// ─────────────────────────────────────────────
// 1. Revenue Overview
// Combines CS ARR/MRR/NRR/GRR + Pipeline contributions
// ─────────────────────────────────────────────
const getRevenueOverview = async (req) => {
  // Delegate CS calculations to csService (DRY principle)
  const csStats = await csService.getCSDashboardStats(req);
  const { summary } = csStats;

  // Pipeline ARR contribution — Weighted pipeline value from open leads
  const { rows: pipelineRows } = await db.query(`
    SELECT 
      COALESCE(SUM(
        CASE sales_stage
          WHEN 'Identified'   THEN COALESCE(ai_estimated_deal_value, 0) * 0.20
          WHEN 'Contacted'    THEN COALESCE(ai_estimated_deal_value, 0) * 0.40
          WHEN 'Qualified'    THEN COALESCE(ai_estimated_deal_value, 0) * 0.50
          WHEN 'Proposal Sent' THEN COALESCE(ai_estimated_deal_value, 0) * 0.70
          WHEN 'Negotiation'  THEN COALESCE(ai_estimated_deal_value, 0) * 0.80
          WHEN 'Won'          THEN COALESCE(ai_estimated_deal_value, 0) * 1.00
          ELSE 0
        END
      ), 0)::float AS weighted_pipeline,
      COALESCE(SUM(ai_estimated_deal_value), 0)::float AS raw_pipeline
    FROM public.leads
    WHERE status NOT IN ('won', 'lost', 'archived')
      AND ai_estimated_deal_value IS NOT NULL
  `);

  const { rows: renewalRows } = await db.query(`
    SELECT COALESCE(SUM(arr), 0)::float AS renewal_arr
    FROM public.customer_accounts
    WHERE status = 'Active'
      AND contract_end_date <= NOW() + INTERVAL '90 days'
      AND contract_end_date >= NOW()
  `);

  const { rows: snapshotRows } = await db.query(`
    SELECT unified_forecast FROM public.revenue_snapshots
    ORDER BY snapshot_date DESC LIMIT 1
  `);

  const forecastARR = snapshotRows.length > 0 ? Number(snapshotRows[0].unified_forecast) : 0;

  return {
    currentARR: summary.totalARR,
    currentMRR: summary.totalMRR,
    forecastARR,
    expansionARR: summary.expansionRevenue,
    renewalARR: renewalRows[0]?.renewal_arr || 0,
    churnedARR: summary.churnedRevenue,
    netARR: summary.totalARR + summary.expansionRevenue - summary.churnedRevenue,
    nrr: summary.nrr,
    grr: summary.grr,
    weightedPipeline: pipelineRows[0]?.weighted_pipeline || 0,
    rawPipeline: pipelineRows[0]?.raw_pipeline || 0,
    averageNPS: summary.averageNPS,
    renewalSuccessRate: summary.renewalSuccessRate
  };
};

// ─────────────────────────────────────────────
// 2. Revenue Composition
// Segments revenue into New / Renewal / Expansion / Churn
// ─────────────────────────────────────────────
const getRevenueComposition = async (req) => {
  // New Revenue: Won pipeline deals in last 90 days
  const { rows: newRevRows } = await db.query(`
    SELECT COALESCE(SUM(ai_estimated_deal_value), 0)::float AS new_revenue
    FROM public.leads
    WHERE status = 'won'
      AND updated_at >= NOW() - INTERVAL '90 days'
  `);

  // Renewal Revenue: Active accounts whose contracts were renewed in last 90 days
  const { rows: renewalRevRows } = await db.query(`
    SELECT COALESCE(SUM(arr), 0)::float AS renewal_revenue
    FROM public.customer_accounts
    WHERE status = 'Active'
      AND contract_end_date >= NOW() - INTERVAL '90 days'
      AND contract_end_date <= NOW() + INTERVAL '7 days'
  `);

  // Expansion Revenue: Won upsell opportunities
  const { rows: expansionRows } = await db.query(`
    SELECT COALESCE(SUM(estimated_value), 0)::float AS expansion_revenue
    FROM public.upsell_opportunities
    WHERE status = 'Won'
  `);

  // Churned Revenue: Churned accounts in last 90 days
  const { rows: churnRows } = await db.query(`
    SELECT COALESCE(SUM(arr), 0)::float AS churned_revenue
    FROM public.customer_accounts
    WHERE status = 'Churned'
      AND updated_at >= NOW() - INTERVAL '90 days'
  `);

  // Monthly trend: group by month for the last 6 months
  const { rows: trend } = await db.query(`
    SELECT 
      DATE_TRUNC('month', created_at) AS month,
      COALESCE(SUM(arr), 0)::float AS arr
    FROM public.customer_accounts
    WHERE created_at >= NOW() - INTERVAL '6 months'
    GROUP BY 1 ORDER BY 1 ASC
  `);

  return {
    newRevenue: newRevRows[0]?.new_revenue || 0,
    renewalRevenue: renewalRevRows[0]?.renewal_revenue || 0,
    expansionRevenue: expansionRows[0]?.expansion_revenue || 0,
    churnedRevenue: churnRows[0]?.churned_revenue || 0,
    monthlyTrend: trend.map(r => ({
      month: new Date(r.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      arr: r.arr
    }))
  };
};

// ─────────────────────────────────────────────
// 3. Revenue Risk Engine
// Weighted risk scoring per approved spec
// ─────────────────────────────────────────────
const getRevenueRisks = async (req) => {
  const risks = [];

  // Critical Churn Accounts (Health Score < 50) → High Risk
  const { rows: criticalAccounts } = await db.query(`
    SELECT id, company_name, arr, health_score, health_trend
    FROM public.customer_accounts
    WHERE health_score < 50 AND status = 'Active'
    ORDER BY arr DESC LIMIT 10
  `);
  criticalAccounts.forEach(a => risks.push({
    type: 'Critical Churn Account',
    entity: a.company_name,
    arr: Number(a.arr),
    riskLevel: 'High',
    riskScore: 90,
    detail: `Health score: ${a.health_score} (Trend: ${a.health_trend || 'Unknown'})`
  }));

  // Renewal < 30 Days → High Risk
  const { rows: renewalUrgent } = await db.query(`
    SELECT id, company_name, arr, contract_end_date
    FROM public.customer_accounts
    WHERE status = 'Active'
      AND contract_end_date <= NOW() + INTERVAL '30 days'
      AND contract_end_date >= NOW()
    ORDER BY arr DESC LIMIT 10
  `);
  renewalUrgent.forEach(a => {
    const days = Math.ceil((new Date(a.contract_end_date) - new Date()) / (1000 * 60 * 60 * 24));
    risks.push({
      type: 'Renewal < 30 Days',
      entity: a.company_name,
      arr: Number(a.arr),
      riskLevel: 'High',
      riskScore: 80,
      detail: `Contract ends in ${days} days`
    });
  });

  // Renewal 30–90 Days → Medium Risk
  const { rows: renewalMedium } = await db.query(`
    SELECT id, company_name, arr, contract_end_date
    FROM public.customer_accounts
    WHERE status = 'Active'
      AND contract_end_date > NOW() + INTERVAL '30 days'
      AND contract_end_date <= NOW() + INTERVAL '90 days'
    ORDER BY arr DESC LIMIT 10
  `);
  renewalMedium.forEach(a => {
    const days = Math.ceil((new Date(a.contract_end_date) - new Date()) / (1000 * 60 * 60 * 24));
    risks.push({
      type: 'Renewal 60-90 Days',
      entity: a.company_name,
      arr: Number(a.arr),
      riskLevel: 'Medium',
      riskScore: 50,
      detail: `Contract ends in ${days} days`
    });
  });

  // Open Churn Escalations → High Risk
  const { rows: escalations } = await db.query(`
    SELECT e.id, a.company_name, a.arr, e.risk_level, e.trigger_reason
    FROM public.churn_risk_escalations e
    JOIN public.customer_accounts a ON e.account_id = a.id
    WHERE e.status = 'Open'
    ORDER BY a.arr DESC LIMIT 10
  `);
  escalations.forEach(e => risks.push({
    type: 'Churn Escalation Open',
    entity: e.company_name,
    arr: Number(e.arr),
    riskLevel: 'High',
    riskScore: 85,
    detail: e.trigger_reason
  }));

  // Pipeline Slippage: Overdue leads with high deal value → Medium
  const { rows: slippage } = await db.query(`
    SELECT name, company, ai_estimated_deal_value, sales_stage, sla_status
    FROM public.leads
    WHERE sla_status = 'Overdue'
      AND ai_estimated_deal_value > 0
    ORDER BY ai_estimated_deal_value DESC LIMIT 10
  `);
  slippage.forEach(l => risks.push({
    type: 'Pipeline Slippage',
    entity: `${l.name} (${l.company || 'Unknown'})`,
    arr: Number(l.ai_estimated_deal_value),
    riskLevel: 'Medium',
    riskScore: 45,
    detail: `${l.sales_stage} - SLA Overdue`
  }));

  // Calculate aggregate
  const atRiskARR = [...criticalAccounts, ...renewalUrgent].reduce((sum, a) => sum + Number(a.arr), 0);
  const overallRiskScore = risks.length > 0
    ? Math.round(risks.reduce((sum, r) => sum + r.riskScore, 0) / risks.length)
    : 0;

  let riskLevel = 'Low';
  if (overallRiskScore >= 70) riskLevel = 'High';
  else if (overallRiskScore >= 40) riskLevel = 'Medium';

  return {
    risks: risks.sort((a, b) => b.riskScore - a.riskScore),
    riskScore: overallRiskScore,
    riskLevel,
    atRiskARR,
    criticalAccounts: criticalAccounts.length,
    churnEscalations: escalations.length,
    pipelineSlippage: slippage.length
  };
};

// ─────────────────────────────────────────────
// 4. Growth Opportunities
// ─────────────────────────────────────────────
const getGrowthOpportunities = async (req) => {
  const { rows: upsells } = await db.query(`
    SELECT u.id, u.title, u.estimated_value, u.status, a.company_name, a.health_score, a.arr
    FROM public.upsell_opportunities u
    JOIN public.customer_accounts a ON u.account_id = a.id
    WHERE u.status NOT IN ('Won', 'Lost')
    ORDER BY u.estimated_value DESC LIMIT 15
  `);

  const { rows: highHealth } = await db.query(`
    SELECT id, company_name, arr, health_score, expansion_score
    FROM public.customer_accounts
    WHERE health_score >= 80 AND status = 'Active'
    ORDER BY expansion_score DESC NULLS LAST, arr DESC LIMIT 10
  `);

  const totalExpansionPipeline = upsells.reduce((sum, u) => sum + Number(u.estimated_value || 0), 0);

  return {
    upsellOpportunities: upsells.map(u => ({
      id: u.id,
      title: u.title,
      estimatedValue: Number(u.estimated_value),
      status: u.status,
      companyName: u.company_name,
      accountHealthScore: u.health_score
    })),
    highHealthAccounts: highHealth,
    totalExpansionPipeline
  };
};

// ─────────────────────────────────────────────
// Snapshot Persistence (called by forecast engine)
// ─────────────────────────────────────────────
const saveRevenueSnapshot = async (snapshotData) => {
  const {
    arr, mrr, nrr, grr,
    pipelineForecast, renewalForecast, expansionForecast,
    expectedChurn, unifiedForecast
  } = snapshotData;

  await db.query(`
    INSERT INTO public.revenue_snapshots 
      (snapshot_date, arr, mrr, nrr, grr, pipeline_forecast, renewal_forecast, expansion_forecast, expected_churn, unified_forecast)
    VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (snapshot_date) DO UPDATE SET
      arr = EXCLUDED.arr, mrr = EXCLUDED.mrr, nrr = EXCLUDED.nrr,
      grr = EXCLUDED.grr, pipeline_forecast = EXCLUDED.pipeline_forecast,
      renewal_forecast = EXCLUDED.renewal_forecast,
      expansion_forecast = EXCLUDED.expansion_forecast,
      expected_churn = EXCLUDED.expected_churn,
      unified_forecast = EXCLUDED.unified_forecast
  `, [arr, mrr, nrr, grr, pipelineForecast, renewalForecast, expansionForecast, expectedChurn, unifiedForecast]);
};

// ─────────────────────────────────────────────
// Revenue Snapshot History
// ─────────────────────────────────────────────
const getRevenueSnapshotHistory = async (limit = 30) => {
  const { rows } = await db.query(`
    SELECT * FROM public.revenue_snapshots
    ORDER BY snapshot_date DESC
    LIMIT $1
  `, [limit]);
  return rows;
};

module.exports = {
  getRevenueOverview,
  getRevenueComposition,
  getRevenueRisks,
  getGrowthOpportunities,
  saveRevenueSnapshot,
  getRevenueSnapshotHistory
};
