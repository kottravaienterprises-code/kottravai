/**
 * revenueCopilotService.js
 * Phase 6C: Executive AI Revenue Copilot
 * 
 * CRITICAL: This service NEVER queries raw DB tables.
 * It ONLY consumes outputs from other services.
 */
const aiProvider = require('./aiProvider');
const revIntel = require('./revenueIntelligenceService');
const forecastSvc = require('./revenueForecastService');

const generateExecutiveBrief = async (req = null) => {
  console.log('[Revenue Copilot] Generating Executive Revenue Brief...');

  // 1. Gather intelligence from service layer only (no raw DB access)
  const [overview, composition, risks, opportunities, forecast] = await Promise.all([
    revIntel.getRevenueOverview(req),
    revIntel.getRevenueComposition(req),
    revIntel.getRevenueRisks(req),
    revIntel.getGrowthOpportunities(req),
    forecastSvc.getForecast('quarterly')
  ]);

  // 2. Build AI prompt from service data
  const systemPrompt = `You are an elite B2B SaaS Revenue Intelligence AI Copilot preparing board-level executive briefings. 
Analyze the following structured revenue data and generate a concise, insight-driven executive narrative. 
Return ONLY valid JSON in the exact structure requested.`;

  const prompt = `
Revenue Intelligence Data (Current Quarter):

OVERVIEW:
- Current ARR: $${overview.currentARR.toLocaleString()}
- NRR: ${overview.nrr}%
- GRR: ${overview.grr}%
- Weighted Pipeline: $${overview.weightedPipeline.toLocaleString()}
- Renewal ARR at Risk: $${overview.renewalARR.toLocaleString()}

FORECAST (${forecast.window}):
- Pipeline Forecast: $${forecast.pipelineForecast.toLocaleString()}
- Renewal Forecast: $${forecast.renewalForecast.toLocaleString()}
- Expansion Forecast: $${forecast.expansionForecast.toLocaleString()}
- Expected Churn: $${forecast.expectedChurn.toLocaleString()}
- Unified Forecast: $${forecast.totalForecast.toLocaleString()}
- Forecast Confidence: ${forecast.confidence.rating} (${forecast.confidence.score}/100)
- Forecast Accuracy: ${forecast.forecastAccuracy !== null ? forecast.forecastAccuracy + '%' : 'First period'}

REVENUE COMPOSITION:
- New Revenue (90d): $${composition.newRevenue.toLocaleString()}
- Renewal Revenue: $${composition.renewalRevenue.toLocaleString()}
- Expansion Revenue: $${composition.expansionRevenue.toLocaleString()}
- Churned Revenue (90d): $${composition.churnedRevenue.toLocaleString()}

RISK PROFILE:
- Risk Level: ${risks.riskLevel} (Score: ${risks.riskScore}/100)
- At-Risk ARR: $${risks.atRiskARR.toLocaleString()}
- Critical Accounts: ${risks.criticalAccounts}
- Open Churn Escalations: ${risks.churnEscalations}
- Pipeline Slippage Count: ${risks.pipelineSlippage}
- Top 3 Risks: ${risks.risks.slice(0, 3).map(r => `${r.type} (${r.entity})`).join(', ')}

GROWTH OPPORTUNITIES:
- Expansion Pipeline: $${opportunities.totalExpansionPipeline.toLocaleString()}
- Open Upsell Opportunities: ${opportunities.upsellOpportunities.length}
- High-Health Accounts: ${opportunities.highHealthAccounts.length}

Return exactly this JSON structure with rich, specific, data-grounded insights (3-5 sentences per section):
{
  "executiveSummary": "<2-3 sentence strategic overview of revenue health and trajectory>",
  "forecastNarrative": "<Explain the forecast composition, confidence, and key drivers>",
  "topOpportunities": ["<Specific, quantified opportunity 1>", "<Specific opportunity 2>", "<Specific opportunity 3>"],
  "topRisks": ["<Specific, quantified risk 1>", "<Specific risk 2>", "<Specific risk 3>"],
  "recommendedActions": ["<Concrete action 1>", "<Concrete action 2>", "<Concrete action 3>"],
  "boardHighlights": ["<Board-level KPI highlight 1>", "<Board-level highlight 2>", "<Board-level highlight 3>"]
}`;

  let parsedResult = null;

  try {
    const response = await aiProvider.generateContent(systemPrompt, prompt);
    const jsonStr = response.text.match(/\{[\s\S]*\}/);
    if (jsonStr) parsedResult = JSON.parse(jsonStr[0]);
  } catch (err) {
    console.warn('[Revenue Copilot] AI call failed, using deterministic fallback:', err.message);
  }

  // 3. Deterministic fallback
  if (!parsedResult) {
    parsedResult = {
      executiveSummary: `Current ARR stands at $${overview.currentARR.toLocaleString()} with NRR at ${overview.nrr}% and GRR at ${overview.grr}%. The ${forecast.confidence.rating.toLowerCase()} confidence forecast projects $${forecast.totalForecast.toLocaleString()} in unified revenue for the quarter. ${risks.riskLevel} risk profile requires ${risks.criticalAccounts > 0 ? 'immediate attention on ' + risks.criticalAccounts + ' critical account(s)' : 'standard monitoring protocols'}.`,
      forecastNarrative: `The unified forecast of $${forecast.totalForecast.toLocaleString()} is composed of pipeline ($${forecast.pipelineForecast.toLocaleString()}), renewals ($${forecast.renewalForecast.toLocaleString()}), and expansion ($${forecast.expansionForecast.toLocaleString()}) offset by expected churn of $${forecast.expectedChurn.toLocaleString()}. Confidence is ${forecast.confidence.rating} at ${forecast.confidence.score}/100.`,
      topOpportunities: [
        `$${opportunities.totalExpansionPipeline.toLocaleString()} expansion pipeline across ${opportunities.upsellOpportunities.length} open upsell opportunities.`,
        `${opportunities.highHealthAccounts.length} high-health accounts are prime candidates for expansion conversations.`,
        `Renewal pipeline of $${overview.renewalARR.toLocaleString()} due within 90 days presents cross-sell leverage.`
      ],
      topRisks: risks.risks.slice(0, 3).map(r => `${r.type}: ${r.entity} — $${r.arr.toLocaleString()} ARR (${r.riskLevel})`),
      recommendedActions: [
        risks.criticalAccounts > 0 ? `Immediately review ${risks.criticalAccounts} critical health accounts with assigned CSMs.` : 'Maintain proactive CSM cadence for At-Risk accounts.',
        risks.pipelineSlippage > 0 ? `Address ${risks.pipelineSlippage} overdue pipeline deals with revised close plans.` : 'Continue pipeline velocity monitoring.',
        `Drive $${opportunities.totalExpansionPipeline.toLocaleString()} expansion pipeline through targeted QBRs with high-health accounts.`
      ],
      boardHighlights: [
        `NRR: ${overview.nrr}% | GRR: ${overview.grr}%`,
        `Quarterly Forecast: $${forecast.totalForecast.toLocaleString()} (${forecast.confidence.rating} confidence)`,
        `Expansion Pipeline: $${opportunities.totalExpansionPipeline.toLocaleString()} | At-Risk ARR: $${risks.atRiskARR.toLocaleString()}`
      ]
    };
  }

  return {
    success: true,
    data: parsedResult,
    groundingData: {
      overview: { currentARR: overview.currentARR, nrr: overview.nrr, grr: overview.grr },
      forecast: { totalForecast: forecast.totalForecast, confidence: forecast.confidence },
      risks: { riskLevel: risks.riskLevel, atRiskARR: risks.atRiskARR }
    }
  };
};

module.exports = { generateExecutiveBrief };
