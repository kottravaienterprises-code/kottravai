const db = require('../db');

const DEFAULT_APPROVAL_THRESHOLD = 80;
const ALLOWED_AUTOMATION_ROLES = new Set(['SUPER_ADMIN', 'MANAGER']);

const normalizeRole = (role = '') => String(role || '').toUpperCase();

const resolveRiskLevel = (confidence, impact = 'Medium') => {
  const normalizedImpact = String(impact || 'Medium').toLowerCase();
  const score = Number(confidence || 0) + (normalizedImpact === 'high' ? 10 : normalizedImpact === 'critical' ? 20 : 0);

  if (score >= 95 || normalizedImpact === 'critical') return 'Critical';
  if (score >= 85 || normalizedImpact === 'high') return 'High';
  if (score >= 70) return 'Medium';
  return 'Low';
};

const resolveConfidenceBand = (confidence) => {
  const score = Number(confidence || 0);
  if (score >= 90) return 'High';
  if (score >= 75) return 'Medium';
  return 'Low';
};

const evaluateRecommendation = ({
  recommendation = {},
  userRole = 'SUPER_ADMIN',
  signalType = 'overview',
  context = {},
  approvalThreshold = DEFAULT_APPROVAL_THRESHOLD,
} = {}) => {
  const confidence = Number(recommendation.confidence || 0);
  const threshold = Number(recommendation.approvalThreshold || approvalThreshold || DEFAULT_APPROVAL_THRESHOLD);
  const normalizedRole = normalizeRole(userRole);
  const policyContext = context || {};
  const policyMatch = Boolean(
    signalType && signalType !== 'overview' && signalType !== ''
  ) || Boolean(policyContext.pipelineHealth || policyContext.forecastVariance || policyContext.businessContext || policyContext.enriched);
  const riskLevel = resolveRiskLevel(confidence, recommendation.impact);
  const approvalRequired = Boolean(
    recommendation.requiresApproval ||
    confidence < threshold ||
    ['high', 'critical'].includes(String(recommendation.impact || '').toLowerCase())
  );
  const automationAllowedRole = ALLOWED_AUTOMATION_ROLES.has(normalizedRole);
  const autonomousExecutionAllowed = Boolean(policyMatch && confidence >= threshold && !approvalRequired && automationAllowedRole);
  const humanOverrideAvailable = Boolean(approvalRequired || !automationAllowedRole || !policyMatch);

  return {
    approvalThreshold: threshold,
    confidenceScore: confidence,
    confidenceBand: resolveConfidenceBand(confidence),
    approvalRequired,
    policyMatch,
    policyStatus: policyMatch ? 'Matched' : 'No Policy Match',
    autonomousExecutionAllowed,
    humanOverrideAvailable,
    riskLevel,
    requestedByRole: normalizedRole || 'SUPER_ADMIN',
    requiresHumanReview: approvalRequired || !automationAllowedRole,
  };
};

const attachGovernanceToRecommendations = (recommendations = [], options = {}) => {
  return recommendations.map((recommendation) => ({
    ...recommendation,
    governance: evaluateRecommendation({
      recommendation,
      userRole: options.userRole,
      signalType: options.signalType,
      context: options.context,
      approvalThreshold: options.approvalThreshold,
    }),
  }));
};

const getAuditTrail = async (limit = 10) => {
  const { rows } = await db.query(
    `SELECT admin_id, action, resource, resource_id, metadata, created_at
     FROM public.admin_audit_logs
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );

  return rows.map((row) => ({
    adminId: row.admin_id,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
};

const logGovernanceEvent = async ({ req = null, action = 'EXECUTIVE_GOVERNANCE', resourceId = 'n/a', metadata = {} } = {}) => {
  try {
    await db.query(
      `INSERT INTO public.admin_audit_logs (admin_id, action, resource, resource_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req?.adminUser?.id || req?.adminId || 'system', action, 'EXECUTIVE_GOVERNANCE', resourceId, JSON.stringify(metadata), req?.ip || null]
    );
    return true;
  } catch (error) {
    console.warn('[Governance] Audit log skipped:', error.message);
    return false;
  }
};

module.exports = {
  DEFAULT_APPROVAL_THRESHOLD,
  evaluateRecommendation,
  attachGovernanceToRecommendations,
  getAuditTrail,
  logGovernanceEvent,
};
