const db = require('../db');
const aiOperationsService = require('./aiOperationsService');

/**
 * Autonomous Operations Service (Phase 7C-A)
 * Evaluates requested actions against the database thresholds.
 * Determines if an action can be auto-approved or if it requires escalation to a human MANAGER/EXECUTIVE.
 */
class AutonomousOpsService {
  /**
   * Retrieves all active autonomous thresholds
   */
  async getThresholds() {
    const result = await db.query('SELECT * FROM public.autonomous_thresholds WHERE active = TRUE ORDER BY action_type ASC');
    return result.rows;
  }

  /**
   * Evaluates if a given action can proceed autonomously.
   * 
   * @param {Object} actionParams 
   * @param {string} actionParams.action_type e.g. 'DISCOUNT_AUTO', 'DISCOUNT_MANAGER', 'DISCOUNT_EXECUTIVE'
   * @param {number} actionParams.requested_discount_percent 
   * @param {number} actionParams.arr_impact 
   * @param {number} actionParams.confidence_score (from AI)
   * 
   * @returns {Object} { canProceed: boolean, escalationRequired: string | null, reason: string }
   */
  async evaluateAction(actionParams) {
    const { action_type, requested_discount_percent = 0, arr_impact = 0, confidence_score = 100 } = actionParams;

    // Default deny if no type specified
    if (!action_type) {
      return { canProceed: false, escalationRequired: 'EXECUTIVE', reason: 'Missing action_type' };
    }

    const result = await db.query('SELECT * FROM public.autonomous_thresholds WHERE action_type = $1 AND active = TRUE', [action_type]);
    
    if (result.rows.length === 0) {
      return { canProceed: false, escalationRequired: 'EXECUTIVE', reason: `No threshold policy found for ${action_type}` };
    }

    const policy = result.rows[0];

    // 1. Check Confidence
    if (confidence_score < policy.min_confidence) {
      return { 
        canProceed: false, 
        escalationRequired: 'MANAGER', 
        reason: `AI Confidence (${confidence_score}%) is below minimum threshold (${policy.min_confidence}%)` 
      };
    }

    // 2. Check Discount
    if (requested_discount_percent > policy.max_discount_percent) {
      // Determine if it should go to Manager or Executive based on absolute size
      const escalation = requested_discount_percent >= 10.0 ? 'EXECUTIVE' : 'MANAGER';
      return { 
        canProceed: false, 
        escalationRequired: escalation, 
        reason: `Requested discount (${requested_discount_percent}%) exceeds policy max (${policy.max_discount_percent}%)` 
      };
    }

    // 3. Check ARR Impact
    if (arr_impact > policy.max_arr_impact) {
       return { 
        canProceed: false, 
        escalationRequired: 'EXECUTIVE', 
        reason: `ARR Impact ($${arr_impact}) exceeds policy max ($${policy.max_arr_impact})` 
      };
    }

    // 4. Check Explicit Approval Requirement
    if (policy.approval_required) {
       let escalation = 'MANAGER';
       if (action_type.includes('EXECUTIVE') || requested_discount_percent > 10 || arr_impact > 5000) {
           escalation = 'EXECUTIVE';
       }
       return { 
        canProceed: false, 
        escalationRequired: escalation,
        reason: `Policy for ${action_type} explicitly requires human approval.` 
      };
    }

    // All conditions met!
    return { canProceed: true, escalationRequired: null, reason: 'Action meets all criteria for full autonomy.' };
  }

  /**
   * Log an AI decision attempt related to autonomy
   */
  async logAutonomyDecision(executionId, taskId, actionParams, evaluationResult) {
     const status = evaluationResult.canProceed ? 'success' : 'escalated';
     const recommendations = evaluationResult.canProceed 
        ? ['Auto-approved execution'] 
        : [`Escalating to ${evaluationResult.escalationRequired}: ${evaluationResult.reason}`];

     await aiOperationsService.logAITrace(
        executionId,
        taskId,
        'AutonomousOps_Evaluation',
        'Autonomous Threshold Engine',
        actionParams,
        { status, details: evaluationResult, recommendations }
     );
  }
}

module.exports = new AutonomousOpsService();
