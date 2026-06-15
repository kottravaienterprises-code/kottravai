const sharedContext = require('./sharedContextService');
const eventEnrichment = require('./eventEnrichmentService');
const governanceService = require('./governanceService');

const generateRecommendations = async (context = {}, options = {}) => {
  const overview = await sharedContext.getExecutiveOverview();
  const enrichedContext = await eventEnrichment.enrichEventContext(context);

  const recommendations = [
    {
      recommendationId: `rec-${Date.now()}`,
      category: 'Revenue Risk',
      confidence: 92,
      impact: 'High',
      recommendedAction: 'Escalate renewal risk and prepare executive intervention',
      requiresApproval: true,
      reasoning: 'Pipeline signals indicate a potential revenue deviation that should be reviewed by leadership.',
      generatedAt: new Date().toISOString(),
      context: enrichedContext
    },
    {
      recommendationId: `rec-${Date.now() + 1}`,
      category: 'Workflow Health',
      confidence: 88,
      impact: 'Medium',
      recommendedAction: 'Route pending workflow approvals to the next available manager',
      requiresApproval: false,
      reasoning: 'Workflow volume is steady and operational throughput remains healthy.',
      generatedAt: new Date().toISOString(),
      context: enrichedContext
    }
  ];

  const governedRecommendations = governanceService.attachGovernanceToRecommendations(recommendations, {
    userRole: options.userRole,
    signalType: options.signalType,
    context: enrichedContext,
    approvalThreshold: options.approvalThreshold,
  });

  return {
    overview,
    recommendations: governedRecommendations,
    summary: {
      total: governedRecommendations.length,
      requiresApproval: governedRecommendations.filter(r => r.requiresApproval).length
    }
  };
};

const orchestrate = async ({ signalType = 'overview', context = {}, userRole = 'SUPER_ADMIN', approvalThreshold = governanceService.DEFAULT_APPROVAL_THRESHOLD } = {}) => {
  const data = await generateRecommendations(context, { userRole, signalType, approvalThreshold });
  const recommendation = data.recommendations[0];

  return {
    success: true,
    signalType,
    recommendation,
    recommendedAction: recommendation?.recommendedAction,
    policy: {
      requiresApproval: recommendation.governance?.approvalRequired,
      approvalThreshold: recommendation.governance?.approvalThreshold,
      confidenceScore: recommendation.governance?.confidenceScore,
      policyMatch: recommendation.governance?.policyMatch,
      autonomousExecutionAllowed: recommendation.governance?.autonomousExecutionAllowed,
      riskLevel: recommendation.governance?.riskLevel,
      confidenceBand: recommendation.governance?.confidenceBand,
    }
  };
};

module.exports = {
  generateRecommendations,
  orchestrate
};
