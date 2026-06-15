const aiProvider = require('./aiProvider');
const db = require('../db');

class CSCopilotService {

  async generateAccountBrief(accountId) {
    console.log(`[CS Copilot] Generating account brief for: ${accountId}`);

    // 1. Fetch Account Data
    const { rows: accRows } = await db.query(`
      SELECT a.*, u.full_name as csm_name
      FROM public.customer_accounts a
      LEFT JOIN public.users u ON a.assigned_csm = u.id
      WHERE a.id = $1
    `, [accountId]);
    
    if (accRows.length === 0) throw new Error('Customer account not found');
    const account = accRows[0];

    // 2. Fetch Journey Events
    const { rows: events } = await db.query(`
      SELECT milestone_name, achieved_at 
      FROM public.customer_journey_events 
      WHERE account_id = $1 ORDER BY achieved_at DESC
    `, [accountId]);

    // 3. Fetch recent history and upsells
    const { rows: upsells } = await db.query(`
      SELECT title, estimated_value, status 
      FROM public.upsell_opportunities 
      WHERE account_id = $1 ORDER BY created_at DESC LIMIT 3
    `, [accountId]);

    const journeyStr = events.map(e => `- ${e.milestone_name} (${new Date(e.achieved_at).toLocaleDateString()})`).join('\n') || 'No milestones recorded.';
    const upsellsStr = upsells.map(u => `- ${u.title}: $${u.estimated_value} (${u.status})`).join('\n') || 'No upsell history.';

    // 4. Build Prompt
    const systemPrompt = 'You are an expert Enterprise Customer Success AI Copilot. Analyze the account data and return ONLY valid JSON matching the exact requested structure.';
    
    const prompt = `
Account Data:
Company: ${account.company_name}
Status: ${account.status}
ARR: $${account.arr}
Health Score: ${account.health_score} (${account.health_trend})
Health Velocity (30d): ${account.health_velocity}
NPS: ${account.nps_score || 'N/A'}
Support Tickets: ${account.support_tickets_count}
Contract End Date: ${account.contract_end_date ? new Date(account.contract_end_date).toLocaleDateString() : 'N/A'}

Journey Milestones:
${journeyStr}

Recent Expansion/Upsells:
${upsellsStr}

Provide a comprehensive AI analysis of this account.
Return exactly this JSON structure:
{
  "accountSummary": "<A 2-3 sentence executive summary of the account's current standing.>",
  "churnRiskExplanation": "<If health is below 70 or velocity is negative, explain the probable risk factors. Otherwise, state 'Account is stable with low churn risk.'>",
  "renewalStrategy": "<A recommended strategy for the upcoming renewal based on health and usage.>",
  "expansionOpportunities": ["<Opportunity 1>", "<Opportunity 2>"],
  "nextBestActions": ["<Action 1>", "<Action 2>"]
}
`;

    let parsedResult = null;
    try {
      const response = await aiProvider.generateContent(systemPrompt, prompt);
      const jsonStr = response.text.match(/\{[\s\S]*\}/);
      if (jsonStr) {
        parsedResult = JSON.parse(jsonStr[0]);
      }
    } catch (err) {
      console.error('[CS Copilot] AI call failed:', err.message);
    }

    if (!parsedResult) {
      // Fallback
      parsedResult = {
        accountSummary: `${account.company_name} is currently ${account.status} with a health score of ${account.health_score}.`,
        churnRiskExplanation: account.health_score < 70 ? "Health score indicates potential churn risk." : "Account appears stable based on health score.",
        renewalStrategy: "Schedule a QBR 90 days prior to contract end date to review value delivered.",
        expansionOpportunities: ["Consider cross-selling enterprise features based on current usage limit."],
        nextBestActions: ["Review open support tickets", "Schedule health check call"]
      };
    }

    // Save as a renewal playbook if renewal is approaching (e.g. < 90 days)
    if (account.contract_end_date) {
        const daysToRenewal = (new Date(account.contract_end_date) - new Date()) / (1000 * 60 * 60 * 24);
        if (daysToRenewal <= 90 && daysToRenewal >= 0) {
            await db.query(`
                INSERT INTO public.renewal_playbooks (account_id, playbook_content, status)
                VALUES ($1, $2, 'Draft')
            `, [accountId, JSON.stringify(parsedResult)]);
        }
    }

    return { success: true, data: parsedResult };
  }
}

module.exports = new CSCopilotService();
