const test = require('node:test');
const assert = require('node:assert/strict');
const executiveAutomationService = require('../services/executiveAutomationService');

test('evaluateAlertRules creates alerts for breached executive thresholds', () => {
  const overview = {
    currentARR: 1000000,
    nrr: 95,
    forecastARR: 900000,
    weightedPipeline: 2000000,
    renewalARR: 300000,
    expansionARR: 200000,
    renewalSuccessRate: 45,
    currentMRR: 80000,
    renewalProbability: 40,
    criticalAccounts: 12,
    arrGrowth: -1.5,
    forecastAccuracy: 80,
  };

  const alerts = executiveAutomationService.evaluateAlertRules({ overview, forecast: { forecastAccuracy: 80 }, risks: { criticalAccounts: 12 } });

  assert.ok(alerts.length >= 4);
  assert.ok(alerts.some((alert) => alert.category === 'Forecast Accuracy'));
  assert.ok(alerts.some((alert) => alert.category === 'NRR'));
  assert.ok(alerts.some((alert) => alert.category === 'Critical Accounts'));
  assert.ok(alerts.every((alert) => alert.severity && alert.message && alert.recommendedAction));
});

test('buildDigest returns the required executive sections', () => {
  const digest = executiveAutomationService.buildDigest({
    overview: { currentARR: 1000000, nrr: 105, grr: 92, forecastARR: 1100000 },
    forecast: { totalForecast: 1100000, confidence: { rating: 'High', score: 88 }, forecastAccuracy: 92 },
    risks: { riskLevel: 'Medium', atRiskARR: 150000, criticalAccounts: 3 },
    opportunities: { totalExpansionPipeline: 500000, upsellOpportunities: [{ id: 1 }], highHealthAccounts: [{ id: 2 }] },
    boardPack: { boardHighlights: ['Board highlight'] },
  });

  const expectedSections = [
    'Executive Summary',
    'Revenue Performance',
    'Forecast Outlook',
    'Top Opportunities',
    'Top Risks',
    'Recommended Actions',
    'Board Highlights',
  ];

  expectedSections.forEach((section) => {
    assert.ok(digest.sections.some((item) => item.title === section));
  });
});
