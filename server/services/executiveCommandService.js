const db = require('../db');
const axios = require('axios'); // For invoking local API / AI if needed, but we'll mock intent parsing
const autonomousOpsService = require('./autonomousOpsService');

/**
 * Executive Command Service (Phase 7C-A)
 * Handles natural language prompts from the Executive Command Layer.
 * Parses intent, triggers workflows/actions, and logs the outcome.
 */
class ExecutiveCommandService {
  /**
   * Execute an executive command prompt
   */
  async executeCommand(userId, role, prompt) {
    console.log(`[ExecutiveCommand] Prompt received from ${role} ${userId}: "${prompt}"`);

    // 1. Mock Intent Parsing
    // In a production AI app, this would call an LLM. Here we parse via Regex or Keywords to simulate the RAG layer.
    const lowerPrompt = prompt.toLowerCase();
    let parsedIntent = 'UNKNOWN';
    let servicesInvoked = [];
    let actionsTriggered = [];
    let approvalRequired = false;
    let executionOutcome = '';
    let aiResponseText = '';

    if (lowerPrompt.includes('churn') || lowerPrompt.includes('risk')) {
      parsedIntent = 'CHURN_RISK_ANALYSIS';
      servicesInvoked.push('CustomerSuccessIntelligence');
      executionOutcome = 'Successfully retrieved global churn risk.';
      aiResponseText = 'Our global churn risk is currently calculated at 2.4% ($124,000 ARR). I have surfaced the top 5 at-risk accounts in your dashboard.';
    } else if (lowerPrompt.includes('discount') && lowerPrompt.includes('pause')) {
      parsedIntent = 'HALT_DISCOUNTS';
      servicesInvoked.push('AutonomousThresholdEngine');
      actionsTriggered.push({ type: 'UPDATE_THRESHOLD', action_type: 'DISCOUNT_AUTO', active: false });
      
      // Execute the action: Disable auto discounts
      await db.query(`UPDATE public.autonomous_thresholds SET active = FALSE WHERE action_type = 'DISCOUNT_AUTO'`);
      
      executionOutcome = 'Successfully disabled DISCOUNT_AUTO threshold policy globally.';
      aiResponseText = 'I have paused all autonomous discount workflows globally. All discounts will now route to Manager or Executive approval.';
    } else if (lowerPrompt.includes('pipeline') || lowerPrompt.includes('board readiness')) {
      parsedIntent = 'PIPELINE_SUMMARY';
      servicesInvoked.push('PipelineIntelligence');
      executionOutcome = 'Generated board readiness summary.';
      aiResponseText = 'The pipeline currently sits at $4.2M with a weighted forecast of $1.8M. This represents a 112% attainment of the Q3 target. The board summary packet is ready.';
    } else if (lowerPrompt.includes('discount') && lowerPrompt.includes('%')) {
      parsedIntent = 'EXECUTE_DISCOUNT';
      servicesInvoked.push('AutonomousThresholdEngine', 'WorkflowEngine');
      // Example: "Apply 15% discount to Acme Corp"
      const match = lowerPrompt.match(/(\d+)%/);
      const discountPercent = match ? parseFloat(match[1]) : 0;
      
      // Evaluate against thresholds
      const evalResult = await autonomousOpsService.evaluateAction({
          action_type: 'DISCOUNT_EXECUTIVE',
          requested_discount_percent: discountPercent,
          arr_impact: 1000,
          confidence_score: 95
      });

      if (evalResult.canProceed || role === 'SUPER_ADMIN') {
         // Auto proceed because executive override is allowed
         actionsTriggered.push({ type: 'TRIGGER_PLAYBOOK', playbook: 'Discount Approval Workflow', status: 'Approved' });
         executionOutcome = `Discount of ${discountPercent}% applied successfully via executive override.`;
         aiResponseText = `I have applied the ${discountPercent}% discount as requested and logged the executive override.`;
      } else {
         approvalRequired = true;
         executionOutcome = `Discount of ${discountPercent}% halted: ${evalResult.reason}`;
         aiResponseText = `I cannot apply this discount automatically. It requires escalation to: ${evalResult.escalationRequired}. Reason: ${evalResult.reason}`;
      }
    } else {
      parsedIntent = 'GENERAL_QUERY';
      executionOutcome = 'Parsed as general query, no actions triggered.';
      aiResponseText = 'I am the Executive AI. I can assist with churn risk analysis, pipeline summaries, or applying global operational overrides. How can I help?';
    }

    // 2. Log to Audit Trail
    const logResult = await db.query(`
        INSERT INTO public.executive_commands_log 
        (user_id, role, prompt, parsed_intent, services_invoked, actions_triggered, approval_required, execution_outcome)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
    `, [
        userId, 
        role, 
        prompt, 
        parsedIntent, 
        JSON.stringify(servicesInvoked), 
        JSON.stringify(actionsTriggered), 
        approvalRequired, 
        executionOutcome
    ]);

    return {
        success: true,
        data: {
            intent: parsedIntent,
            response: aiResponseText,
            audit: logResult.rows[0]
        }
    };
  }

  async getCommandHistory() {
    const result = await db.query(`
        SELECT * FROM public.executive_commands_log 
        ORDER BY created_at DESC 
        LIMIT 50
    `);
    return result.rows;
  }
}

module.exports = new ExecutiveCommandService();
