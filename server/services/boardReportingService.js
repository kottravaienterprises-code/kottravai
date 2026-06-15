/**
 * boardReportingService.js
 * Phase 6C: Board Reporting Engine
 * 
 * Returns a structured JSON Board Pack.
 * Frontend handles PDF/CSV rendering.
 * Board report generation is audit-logged.
 */
const revIntel = require('./revenueIntelligenceService');
const forecastSvc = require('./revenueForecastService');

const generateBoardPack = async (timeframe = 'quarterly', req = null) => {
  console.log(`[Board Reporting] Generating ${timeframe} board pack...`);

  // Gather all intelligence in parallel
  const [overview, composition, risks, opportunities, forecast, snapshots] = await Promise.all([
    revIntel.getRevenueOverview(req),
    revIntel.getRevenueComposition(req),
    revIntel.getRevenueRisks(req),
    revIntel.getGrowthOpportunities(req),
    forecastSvc.getForecast(timeframe),
    revIntel.getRevenueSnapshotHistory(6)
  ]);

  // Board Highlights (key narrative points derived from data)
  const boardHighlights = [];

  if (overview.nrr > 110) boardHighlights.push(`Strong NRR of ${overview.nrr.toFixed(1)}% indicates healthy expansion revenue.`);
  else if (overview.nrr < 90) boardHighlights.push(`⚠️ NRR of ${overview.nrr.toFixed(1)}% is below retention threshold. Churn intervention required.`);

  if (risks.atRiskARR > 0) boardHighlights.push(`$${risks.atRiskARR.toLocaleString()} ARR is at elevated churn risk across ${risks.criticalAccounts} critical account(s).`);

  if (forecast.confidence.rating === 'High') boardHighlights.push(`Forecast confidence is ${forecast.confidence.rating} (${forecast.confidence.score}/100) for the ${timeframe} period.`);

  if (opportunities.totalExpansionPipeline > 0) boardHighlights.push(`$${opportunities.totalExpansionPipeline.toLocaleString()} expansion pipeline identified across ${opportunities.upsellOpportunities.length} open upsell opportunities.`);

  if (forecast.forecastAccuracy !== null) boardHighlights.push(`Historical forecast accuracy: ${forecast.forecastAccuracy}%.`);

  const boardPack = {
    generatedAt: new Date().toISOString(),
    timeframe,
    overview: {
      currentARR: overview.currentARR,
      currentMRR: overview.currentMRR,
      forecastARR: forecast.totalForecast,
      forecastAccuracy: forecast.forecastAccuracy,
      nrr: overview.nrr,
      grr: overview.grr,
      averageNPS: overview.averageNPS,
      renewalSuccessRate: overview.renewalSuccessRate,
      weightedPipeline: overview.weightedPipeline
    },
    forecast: {
      window: forecast.window,
      pipelineForecast: forecast.pipelineForecast,
      renewalForecast: forecast.renewalForecast,
      expansionForecast: forecast.expansionForecast,
      expectedChurn: forecast.expectedChurn,
      totalForecast: forecast.totalForecast,
      confidence: forecast.confidence
    },
    composition: {
      newRevenue: composition.newRevenue,
      renewalRevenue: composition.renewalRevenue,
      expansionRevenue: composition.expansionRevenue,
      churnedRevenue: composition.churnedRevenue,
      monthlyTrend: composition.monthlyTrend
    },
    risks: {
      riskScore: risks.riskScore,
      riskLevel: risks.riskLevel,
      atRiskARR: risks.atRiskARR,
      criticalAccounts: risks.criticalAccounts,
      churnEscalations: risks.churnEscalations,
      pipelineSlippage: risks.pipelineSlippage,
      topRisks: risks.risks.slice(0, 10)
    },
    opportunities: {
      totalExpansionPipeline: opportunities.totalExpansionPipeline,
      upsellCount: opportunities.upsellOpportunities.length,
      highHealthAccounts: opportunities.highHealthAccounts.length,
      topUpsells: opportunities.upsellOpportunities.slice(0, 5)
    },
    snapshotHistory: snapshots,
    boardHighlights
  };

  return boardPack;
};

// Generate CSV export from board pack
const generateBoardPackCSV = (boardPack) => {
  const rows = [
    ['Metric', 'Value'],
    ['Generated At', boardPack.generatedAt],
    ['Timeframe', boardPack.timeframe],
    ['Current ARR', boardPack.overview.currentARR],
    ['Current MRR', boardPack.overview.currentMRR],
    ['Forecast ARR', boardPack.overview.forecastARR],
    ['Forecast Accuracy (%)', boardPack.overview.forecastAccuracy ?? 'N/A'],
    ['NRR (%)', boardPack.overview.nrr],
    ['GRR (%)', boardPack.overview.grr],
    ['Average NPS', boardPack.overview.averageNPS],
    ['Pipeline Forecast', boardPack.forecast.pipelineForecast],
    ['Renewal Forecast', boardPack.forecast.renewalForecast],
    ['Expansion Forecast', boardPack.forecast.expansionForecast],
    ['Expected Churn', boardPack.forecast.expectedChurn],
    ['Unified Forecast', boardPack.forecast.totalForecast],
    ['Confidence Score', boardPack.forecast.confidence.score],
    ['Confidence Rating', boardPack.forecast.confidence.rating],
    ['New Revenue (90d)', boardPack.composition.newRevenue],
    ['Renewal Revenue (90d)', boardPack.composition.renewalRevenue],
    ['Expansion Revenue', boardPack.composition.expansionRevenue],
    ['Churned Revenue (90d)', boardPack.composition.churnedRevenue],
    ['Risk Level', boardPack.risks.riskLevel],
    ['At-Risk ARR', boardPack.risks.atRiskARR],
    ['Critical Accounts', boardPack.risks.criticalAccounts],
    ['Churn Escalations', boardPack.risks.churnEscalations],
    ['Expansion Pipeline', boardPack.opportunities.totalExpansionPipeline],
    ['Open Upsell Opportunities', boardPack.opportunities.upsellCount],
    ...boardPack.boardHighlights.map((h, i) => [`Board Highlight ${i + 1}`, h])
  ];

  return rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
};

module.exports = { generateBoardPack, generateBoardPackCSV };
