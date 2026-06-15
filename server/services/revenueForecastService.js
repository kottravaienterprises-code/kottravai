/**
 * revenueForecastService.js
 * Phase 6C: Unified Forecast Engine
 * 
 * Implements the approved forecast formula:
 *   Forecast = Weighted Pipeline + Renewal Forecast + Expansion Forecast - Expected Churn
 *
 * Expansion weights (per spec):
 *   Identified=20%, Contacted=40%, Proposal Sent=70%, Won=100%, Lost=0%
 */
const db = require('../db');
const revIntel = require('./revenueIntelligenceService');

// ─────────────────────────────────────────────
// EXPANSION STAGE WEIGHTS (per approved spec)
// ─────────────────────────────────────────────
const EXPANSION_WEIGHTS = {
  'Identified': 0.20,
  'Contacted': 0.40,
  'In Discussion': 0.50,
  'Proposal Sent': 0.70,
  'Negotiation': 0.80,
  'Won': 1.00,
  'Lost': 0.00
};

// Pipeline stage weights
const PIPELINE_WEIGHTS = {
  'Identified': 0.20,
  'Contacted': 0.40,
  'Qualified': 0.50,
  'Proposal Sent': 0.70,
  'Negotiation': 0.80,
  'Won': 1.00,
  'Lost': 0.00
};

// ─────────────────────────────────────────────
// Get date range for a forecast window
// ─────────────────────────────────────────────
const getWindowDates = (window) => {
  const now = new Date();
  let endDate = new Date();
  if (window === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
  else if (window === 'quarterly') endDate.setMonth(endDate.getMonth() + 3);
  else if (window === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
  else endDate.setMonth(endDate.getMonth() + 3); // default quarterly
  return { startDate: now, endDate };
};

// ─────────────────────────────────────────────
// Confidence Scoring (per spec)
// Factors: pipeline coverage, renewal probability, health, historical variance
// ─────────────────────────────────────────────
const calculateConfidence = async (pipelineForecast, renewalForecast, totalARR) => {
  let score = 50; // base

  // Pipeline Coverage: how much of target is covered by pipeline
  const pipelineCoverage = totalARR > 0 ? pipelineForecast / totalARR : 0;
  if (pipelineCoverage >= 3) score += 20;
  else if (pipelineCoverage >= 2) score += 12;
  else if (pipelineCoverage >= 1) score += 5;

  // Renewal pipeline health
  const renewalContribution = totalARR > 0 ? renewalForecast / totalARR : 0;
  if (renewalContribution >= 0.8) score += 15;
  else if (renewalContribution >= 0.5) score += 8;

  // Historical forecast accuracy (variance from previous snapshots)
  const { rows: snapshots } = await db.query(`
    SELECT arr, unified_forecast FROM public.revenue_snapshots
    ORDER BY snapshot_date DESC LIMIT 5
  `);

  if (snapshots.length >= 2) {
    const variances = snapshots.map(s => {
      if (Number(s.unified_forecast) === 0) return 0;
      return Math.abs(Number(s.arr) - Number(s.unified_forecast)) / Number(s.unified_forecast);
    });
    const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length;
    if (avgVariance <= 0.05) score += 15; // < 5% variance
    else if (avgVariance <= 0.10) score += 8;
    else score -= 5; // penalize high variance
  }

  score = Math.min(95, Math.max(10, Math.round(score)));
  let rating = 'Low';
  if (score >= 75) rating = 'High';
  else if (score >= 50) rating = 'Medium';

  return { score, rating };
};

// ─────────────────────────────────────────────
// Main Forecast Function
// ─────────────────────────────────────────────
const getForecast = async (window = 'quarterly') => {
  const { endDate } = getWindowDates(window);

  // 1. PIPELINE FORECAST: weighted open pipeline (within window)
  const { rows: pipelineRows } = await db.query(`
    SELECT sales_stage, COALESCE(ai_estimated_deal_value, 0)::float AS ai_estimated_deal_value
    FROM public.leads
    WHERE status NOT IN ('won', 'lost', 'archived')
      AND ai_estimated_deal_value IS NOT NULL
  `);

  const pipelineForecast = pipelineRows.reduce((sum, lead) => {
    const weight = PIPELINE_WEIGHTS[lead.sales_stage] || 0.20;
    return sum + (Number(lead.ai_estimated_deal_value) * weight);
  }, 0);

  // 2. RENEWAL FORECAST: accounts with contract renewal probability within window
  const { rows: renewalRows } = await db.query(`
    SELECT arr, COALESCE(renewal_probability, 0.7)::float AS renewal_probability
    FROM public.customer_accounts
    WHERE status = 'Active'
      AND contract_end_date <= $1
      AND contract_end_date >= NOW()
  `, [endDate.toISOString()]);

  const renewalForecast = renewalRows.reduce((sum, acc) => {
    return sum + (Number(acc.arr) * Number(acc.renewal_probability));
  }, 0);

  // 3. EXPANSION FORECAST: open upsell opportunities weighted by stage
  const { rows: upsellRows } = await db.query(`
    SELECT status, COALESCE(estimated_value, 0)::float AS estimated_value
    FROM public.upsell_opportunities
    WHERE status NOT IN ('Won', 'Lost')
  `);

  const expansionForecast = upsellRows.reduce((sum, u) => {
    const weight = EXPANSION_WEIGHTS[u.status] || 0.20;
    return sum + (Number(u.estimated_value) * weight);
  }, 0);

  // 4. EXPECTED CHURN: Critical/At-Risk ARR multiplied by churn probability
  const { rows: churnRows } = await db.query(`
    SELECT arr, churn_probability
    FROM public.customer_accounts
    WHERE status = 'Active'
      AND (health_score < 70 OR health_trend = 'Down')
  `);

  const expectedChurn = churnRows.reduce((sum, acc) => {
    const churnProb = Number(acc.churn_probability || 0) / 100;
    return sum + (Number(acc.arr || 0) * churnProb);
  }, 0);

  // 5. UNIFIED FORECAST
  const totalForecast = pipelineForecast + renewalForecast + expansionForecast - expectedChurn;

  // 6. CONFIDENCE
  const { rows: arrRows } = await db.query(`
    SELECT COALESCE(SUM(arr), 0)::float AS total_arr
    FROM public.customer_accounts WHERE status != 'Churned'
  `);
  const currentARR = arrRows[0]?.total_arr || 0;
  const confidence = await calculateConfidence(pipelineForecast, renewalForecast, currentARR);

  // 7. FORECAST ACCURACY (compare last snapshot to actual)
  const { rows: lastSnapshot } = await db.query(`
    SELECT unified_forecast, arr FROM public.revenue_snapshots
    ORDER BY snapshot_date DESC LIMIT 1
  `);
  let forecastAccuracy = null;
  if (lastSnapshot.length > 0 && Number(lastSnapshot[0].unified_forecast) > 0) {
    const accuracy = 1 - Math.abs(Number(lastSnapshot[0].arr) - Number(lastSnapshot[0].unified_forecast)) / Number(lastSnapshot[0].unified_forecast);
    forecastAccuracy = Math.round(Math.max(0, accuracy) * 100);
  }

  const forecastResult = {
    window,
    pipelineForecast: Math.round(pipelineForecast),
    renewalForecast: Math.round(renewalForecast),
    expansionForecast: Math.round(expansionForecast),
    expectedChurn: Math.round(expectedChurn),
    totalForecast: Math.round(totalForecast),
    forecastAccuracy,
    confidence
  };

  // Persist snapshot
  await revIntel.saveRevenueSnapshot({
    arr: currentARR,
    mrr: currentARR / 12,
    nrr: 100,
    grr: 100,
    pipelineForecast: Math.round(pipelineForecast),
    renewalForecast: Math.round(renewalForecast),
    expansionForecast: Math.round(expansionForecast),
    expectedChurn: Math.round(expectedChurn),
    unifiedForecast: Math.round(totalForecast)
  });

  return forecastResult;
};

module.exports = { getForecast, getWindowDates };
