const assert = require('assert');
const governanceService = require('../services/governanceService');

const approvedRecommendation = {
  recommendationId: 'rec-1',
  confidence: 92,
  impact: 'High',
  requiresApproval: true,
  context: { pipelineHealth: 'at_risk', forecastVariance: 14 }
};

const blockedRecommendation = {
  recommendationId: 'rec-2',
  confidence: 72,
  impact: 'Medium',
  requiresApproval: false,
  context: { pipelineHealth: 'stable' }
};

const approved = governanceService.evaluateRecommendation({ recommendation: approvedRecommendation, userRole: 'SUPER_ADMIN', signalType: 'pipeline_slippage' });
assert.strictEqual(approved.approvalRequired, true, 'High-risk recommendations should require approval');
assert.strictEqual(approved.autonomousExecutionAllowed, false, 'Approval-required actions should not be auto-executed');
assert.strictEqual(approved.policyMatch, true, 'Policy should match when the signal context is present');

const blocked = governanceService.evaluateRecommendation({ recommendation: blockedRecommendation, userRole: 'REPRESENTATIVE', signalType: 'pipeline_slippage' });
assert.strictEqual(blocked.autonomousExecutionAllowed, false, 'Low-confidence actions should be blocked');
assert.strictEqual(blocked.riskLevel, 'Medium', 'Risk classification should be assigned');

console.log('governance service tests passed');
