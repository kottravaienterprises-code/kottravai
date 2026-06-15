const db = require('../db');
const aiProvider = require('./aiProvider');
const leadService = require('./leadService');

class RevOpsService {
  /**
   * Deterministic rule-based fallback logic for estimating deal value.
   * Guarantees estimate returns a numeric value and low/medium/high confidence.
   */
  getHeuristicPrediction(source, industry, orgType, location, leadScore, intentScore, commActivity) {
    let baseValue = 100000; // default ₹1 Lakh base
    let multiplier = 1.0;

    // Org Type multipliers
    if (orgType) {
      const ot = orgType.toLowerCase();
      if (ot.includes('enterprise')) multiplier *= 5.0;
      else if (ot.includes('mid-market')) multiplier *= 2.5;
      else if (ot.includes('startup')) multiplier *= 1.2;
      else if (ot.includes('smb')) multiplier *= 0.8;
    }

    // Industry multipliers
    if (industry) {
      const ind = industry.toLowerCase();
      if (ind.includes('software') || ind.includes('tech') || ind.includes('saas')) multiplier *= 1.5;
      else if (ind.includes('finance') || ind.includes('banking')) multiplier *= 1.8;
      else if (ind.includes('healthcare') || ind.includes('medical')) multiplier *= 1.3;
      else if (ind.includes('retail') || ind.includes('ecommerce')) multiplier *= 0.9;
    }

    // Lead & Intent Score context
    const avgScore = ((Number(leadScore || 50)) + (Number(intentScore || 50))) / 2;
    multiplier *= (0.5 + (avgScore / 100)); // 50 gives 1.0x, 100 gives 1.5x, 0 gives 0.5x

    // Comm activity multiplier
    const comms = Number(commActivity || 0);
    if (comms > 10) multiplier *= 1.25;
    else if (comms > 5) multiplier *= 1.1;

    const estimatedDealValue = Math.round(baseValue * multiplier);
    
    let confidence = 'Low';
    if (avgScore >= 75 && comms >= 5) confidence = 'High';
    else if (avgScore >= 45) confidence = 'Medium';

    const reasoning = `Calculated via local heuristic formula. Inputs: Org Type = ${orgType || 'N/A'}, Industry = ${industry || 'N/A'}, Location = ${location || 'N/A'}, Lead Score = ${leadScore || 0}, Intent Score = ${intentScore || 0}, ActivitiesCount = ${comms}. Combined score rating multiplier is ${multiplier.toFixed(2)}x.`;

    return {
      estimatedDealValue,
      confidence,
      reasoning
    };
  }

  /**
   * AI Deal Value Predictor
   * Calls AI model if keys exist, otherwise falls back to heuristics.
   */
  async predictDealValue(leadData) {
    const {
      source = 'Unknown',
      industry = 'Unknown',
      org_type = 'Unknown',
      location = 'Unknown',
      lead_score = 50,
      intent_score = 50,
      comm_activity_count = 0
    } = leadData;

    const hasKeys = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;

    if (hasKeys) {
      const systemPrompt = "You are an AI Sales Operations Forecaster. Given lead profile details, output a valid JSON response containing estimated deal value in Indian Rupees, confidence level (High/Medium/Low), and a short reason.";
      const userMessage = `
Predict deal size details for this sales lead:
- Lead Source: ${source}
- Industry: ${industry}
- Organization Type: ${org_type}
- Location: ${location}
- Lead Score: ${lead_score}
- Intent Score: ${intent_score}
- Communication Activity Count: ${comm_activity_count}

Return strictly in JSON format:
{
  "estimatedDealValue": 150000,
  "confidence": "High",
  "reasoning": "Explain the analysis..."
}
`;
      try {
        const response = await aiProvider.generateContent(systemPrompt, userMessage);
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            estimatedDealValue: Number(parsed.estimatedDealValue || 0),
            confidence: parsed.confidence || 'Medium',
            reasoning: parsed.reasoning || 'AI-generated estimate.',
            aiGenerated: true
          };
        }
      } catch (err) {
        console.warn("[RevOpsService] AI prediction failed, invoking heuristic fallback:", err.message);
      }
    }

    // Heuristic fallback
    const heuristic = this.getHeuristicPrediction(
      source,
      industry,
      org_type,
      location,
      lead_score,
      intent_score,
      comm_activity_count
    );

    return {
      ...heuristic,
      aiGenerated: false
    };
  }

  /**
   * Scans and flags leads exceeding SLA thresholds:
   * Qualified: 7 Days
   * Proposal Sent: 14 Days
   * Negotiation: 21 Days
   */
  async checkStageSLAs() {
    console.log('[RevOpsService] Running Stage-Gate SLA sweeps...');
    const results = {
      flaggedOverdue: 0,
      errors: 0
    };

    try {
      const query = `
        SELECT id, name, sales_stage, stage_entered_at, sla_status, assigned_to
        FROM public.leads
        WHERE sales_stage IN ('Qualified', 'Proposal Sent', 'Negotiation')
          AND sla_status = 'On Track'
      `;
      
      const { rows: leads } = await db.query(query);

      for (const lead of leads) {
        let thresholdDays = 7;
        if (lead.sales_stage === 'Proposal Sent') thresholdDays = 14;
        else if (lead.sales_stage === 'Negotiation') thresholdDays = 21;

        const stageEntered = new Date(lead.stage_entered_at || Date.now());
        const limitTime = Date.now() - (thresholdDays * 24 * 60 * 60 * 1000);

        if (stageEntered.getTime() < limitTime) {
          try {
            // Flag lead as overdue
            await db.query(`
              UPDATE public.leads 
              SET 
                sla_status = 'Overdue',
                sla_flagged_at = CURRENT_TIMESTAMP
              WHERE id = $1
            `, [lead.id]);

            // Calculate duration in stage
            const daysInStage = Math.round((Date.now() - stageEntered.getTime()) / (1000 * 60 * 60 * 24));
            
            // Update leads stage_duration_days
            await db.query(`
              UPDATE public.leads
              SET stage_duration_days = $1
              WHERE id = $2
            `, [daysInStage, lead.id]);

            // Log activity
            await leadService.logActivity(
              lead.id,
              'Lead Escalated',
              `Lead breached SLA for stage "${lead.sales_stage}" (${daysInStage} days spent, SLA is ${thresholdDays} days)`
            );

            results.flaggedOverdue++;
          } catch (err) {
            console.error(`[RevOpsService] Failed to flag lead ${lead.id}:`, err);
            results.errors++;
          }
        }
      }
      
      console.log('[RevOpsService] SLA sweeps finished:', results);
      return { success: true, results };
    } catch (err) {
      console.error('[RevOpsService] SLA sweeps failed:', err);
      return { success: false, error: err.message, results };
    }
  }
}

module.exports = new RevOpsService();
