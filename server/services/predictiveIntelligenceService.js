const db = require('../db');
const aiProvider = require('./aiProvider');
const aiOps = require('./aiOperationsService');
const autonomousOpsService = require('./autonomousOpsService');
const orchestrator = require('./autonomousRevenueOrchestrator');
const executiveCommandService = require('./executiveCommandService');

/**
 * Predictive Intelligence Service (Phase 7C-B)
 * Core engine for AI-driven anomaly detection, predictive churn/expansion scoring,
 * and autonomous intervention recommendation.
 */
class PredictiveIntelligenceService {
  
  // ============================================================================
  // 1. REVENUE ANOMALY DETECTION ENGINE
  // ============================================================================
  async detectRevenueAnomalies() {
    console.log('[PredictiveEngine] Running anomaly detection...');
    let anomaliesDetected = [];

    // 1. Pipeline Velocity Drop / Collapse Check
    const { rows: pipelineMetrics } = await db.query(`
        SELECT 
            DATE_TRUNC('week', created_at) as week,
            COUNT(id) as new_leads,
            SUM(ai_estimated_deal_value) as pipeline_value
        FROM public.leads
        WHERE created_at >= NOW() - INTERVAL '4 weeks'
        GROUP BY 1 ORDER BY 1 DESC
    `);

    if (pipelineMetrics.length >= 2) {
        const thisWeek = pipelineMetrics[0].pipeline_value || 0;
        const lastWeek = pipelineMetrics[1].pipeline_value || 0;
        
        if (lastWeek > 0) {
            const variance = ((thisWeek - lastWeek) / lastWeek) * 100;
            
            if (variance <= -30) {
                anomaliesDetected.push({
                    category: 'Pipeline Velocity Drop',
                    severity: 'Critical',
                    metric_name: 'Weekly Pipeline Created',
                    expected_value: lastWeek,
                    actual_value: thisWeek,
                    variance_percent: Math.abs(variance),
                    description: `Critical pipeline collapse detected. Pipeline generation dropped by ${Math.abs(variance).toFixed(1)}% compared to last week.`
                });
            } else if (variance <= -15) {
                anomaliesDetected.push({
                    category: 'Pipeline Velocity Drop',
                    severity: 'Medium',
                    metric_name: 'Weekly Pipeline Created',
                    expected_value: lastWeek,
                    actual_value: thisWeek,
                    variance_percent: Math.abs(variance),
                    description: `Pipeline slowdown detected. Generation dropped by ${Math.abs(variance).toFixed(1)}% compared to last week.`
                });
            }
        }
    }

    // 2. Forecast Variance Spike
    const { rows: snapshots } = await db.query(`
        SELECT unified_forecast, snapshot_date FROM public.revenue_snapshots
        ORDER BY snapshot_date DESC LIMIT 2
    `);
    
    if (snapshots.length === 2) {
        const latest = snapshots[0].unified_forecast;
        const previous = snapshots[1].unified_forecast;
        if (previous > 0) {
            const variance = ((latest - previous) / previous) * 100;
            if (Math.abs(variance) >= 15) {
                anomaliesDetected.push({
                    category: 'Forecast Variance Spike',
                    severity: Math.abs(variance) >= 25 ? 'High' : 'Medium',
                    metric_name: 'Unified Revenue Forecast',
                    expected_value: previous,
                    actual_value: latest,
                    variance_percent: Math.abs(variance),
                    description: `Forecast variance of ${Math.abs(variance).toFixed(1)}% detected between recent snapshots.`
                });
            }
        }
    }

    // Process & Persist Anomalies
    for (const anomaly of anomaliesDetected) {
        const result = await db.query(`
            INSERT INTO public.predictive_anomalies 
            (category, severity, metric_name, expected_value, actual_value, variance_percent, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id;
        `, [anomaly.category, anomaly.severity, anomaly.metric_name, anomaly.expected_value, anomaly.actual_value, anomaly.variance_percent, anomaly.description]);
        
        anomaly.id = result.rows[0].id;

        // Hybrid Notification Approach
        if (anomaly.severity === 'Critical' || anomaly.severity === 'High') {
            await this._triggerExecutiveAlert(anomaly);
        }
    }

    return anomaliesDetected;
  }

  async _triggerExecutiveAlert(anomaly) {
      console.log(`[PredictiveEngine] 🚨 HIGH/CRITICAL ANOMALY ALERT: ${anomaly.description}`);
      // In production, this would trigger Email/SMS via executiveAutomationService or eventBus
  }

  // ============================================================================
  // 2. PREDICTIVE CHURN & EXPANSION SIGNALS
  // ============================================================================
  
  /**
   * Run nightly batch predictions for all active accounts
   */
  async runNightlyPredictions() {
      const { rows: accounts } = await db.query(`
          SELECT id, company_name, arr, health_score, nps_score, health_trend
          FROM public.customer_accounts
          WHERE status = 'Active'
      `);

      for (const account of accounts) {
          // In a real app, this would be a single batch call or grouped. 
          // For the prototype, we process iteratively or use heuristics for scaling.
          await this.predictAccountRiskAndExpansion(account.id);
      }
  }

  /**
   * Real-time prediction for a single account
   */
  async predictAccountRiskAndExpansion(accountId) {
      const { rows } = await db.query(`SELECT * FROM public.customer_accounts WHERE id = $1`, [accountId]);
      if (rows.length === 0) return null;
      const account = rows[0];

      // 1. Churn Prediction Prompt
      const churnPrompt = `
      You are an expert B2B SaaS Churn Prediction AI.
      Analyze the following account data and output a strictly valid JSON object predicting churn risk.
      Data: Company=${account.company_name}, ARR=$${account.arr}, Health Score=${account.health_score}, NPS=${account.nps_score || 'N/A'}.
      
      Output JSON Format:
      {
        "riskScore": (integer 0-100, 100 is highest risk),
        "riskLevel": ("Low", "Medium", "High", "Critical"),
        "confidence": (integer 0-100),
        "drivers": ["reason 1", "reason 2"]
      }
      `;

      // 2. Expansion Prediction Prompt
      const expansionPrompt = `
      You are an expert B2B SaaS Expansion Prediction AI.
      Analyze the following account data and output a strictly valid JSON object predicting expansion (upsell) potential.
      Data: Company=${account.company_name}, ARR=$${account.arr}, Health Score=${account.health_score}, NPS=${account.nps_score || 'N/A'}.
      
      Output JSON Format:
      {
        "riskScore": (integer 0-100, 100 is highest probability of expansion),
        "riskLevel": ("Low", "Medium", "High", "Critical" based on probability),
        "confidence": (integer 0-100),
        "drivers": ["reason 1", "reason 2"]
      }
      `;

      let churnResult, expansionResult;
      
      try {
          const churnRaw = await aiProvider.generateContent(churnPrompt, "Generate churn prediction JSON.");
          // Extract JSON if model wrapped it in markdown
          const cStr = churnRaw.text.replace(/```json/g, '').replace(/```/g, '').trim();
          churnResult = JSON.parse(cStr);

          const expRaw = await aiProvider.generateContent(expansionPrompt, "Generate expansion prediction JSON.");
          const eStr = expRaw.text.replace(/```json/g, '').replace(/```/g, '').trim();
          expansionResult = JSON.parse(eStr);
      } catch (err) {
          console.error('[PredictiveEngine] AI parsing error. Using fallback heuristics.', err.message);
          // Fallback Heuristics
          churnResult = {
              riskScore: account.health_score < 50 ? 85 : 20,
              riskLevel: account.health_score < 50 ? 'High' : 'Low',
              confidence: 80,
              drivers: [`Health score is ${account.health_score}`]
          };
          expansionResult = {
              riskScore: account.health_score >= 80 ? 75 : 30,
              riskLevel: account.health_score >= 80 ? 'High' : 'Low',
              confidence: 80,
              drivers: [`Health score is ${account.health_score}`]
          };
      }

      // Persist Churn Signal
      const cRes = await db.query(`
          INSERT INTO public.predictive_signals 
          (account_id, signal_type, risk_score, risk_level, confidence, drivers, data_sources)
          VALUES ($1, 'CHURN', $2, $3, $4, $5, $6)
          RETURNING id;
      `, [accountId, churnResult.riskScore, churnResult.riskLevel, churnResult.confidence, JSON.stringify(churnResult.drivers), JSON.stringify(['CRM', 'Usage Logs'])]);

      // Persist Expansion Signal
      const eRes = await db.query(`
          INSERT INTO public.predictive_signals 
          (account_id, signal_type, risk_score, risk_level, confidence, drivers, data_sources)
          VALUES ($1, 'EXPANSION', $2, $3, $4, $5, $6)
          RETURNING id;
      `, [accountId, expansionResult.riskScore, expansionResult.riskLevel, expansionResult.confidence, JSON.stringify(expansionResult.drivers), JSON.stringify(['CRM', 'Billing'])]);

      // Generate Interventions
      if (churnResult.riskScore >= 70) {
          await this.generateInterventions('SIGNAL', cRes.rows[0].id, 'CHURN', account, churnResult);
      }
      if (expansionResult.riskScore >= 70) {
          await this.generateInterventions('SIGNAL', eRes.rows[0].id, 'EXPANSION', account, expansionResult);
      }

      return { churn: churnResult, expansion: expansionResult };
  }

  // ============================================================================
  // 3. AUTONOMOUS INTERVENTION RECOMMENDATIONS
  // ============================================================================
  
  async generateInterventions(sourceType, sourceId, context, account, signalResult) {
      let interventions = [];

      if (context === 'CHURN') {
          // Playbook 1: Schedule Executive Review
          interventions.push({
              action_type: 'Schedule Executive Review',
              description: `Drafted task for CSM to schedule executive alignment call due to high churn risk.`,
              playbook: 'Executive Recovery Playbook'
          });

          // Playbook 2: Offer Discount if Health is recoverable
          if (signalResult.riskScore >= 80) {
             interventions.push({
                 action_type: 'Apply Discount',
                 description: `Drafted recommendation to offer 10% discount to prevent churn.`,
                 playbook: 'Churn Recovery Discount'
             });
          }
      } else if (context === 'EXPANSION') {
          interventions.push({
              action_type: 'Schedule QBR',
              description: `Drafted task for CSM to schedule a QBR to discuss expansion opportunities.`,
              playbook: 'Expansion QBR Playbook'
          });
      }

      for (const inv of interventions) {
          // Determine Approval Routing based on Phase 7C-A Thresholds
          let approvalStatus = 'PENDING';
          
          if (inv.action_type === 'Apply Discount') {
              const evalResult = await autonomousOpsService.evaluateAction({
                  action_type: 'CHURN_RECOVERY', // From phase 7c-a migration
                  requested_discount_percent: 10,
                  arr_impact: account.arr * 0.10,
                  confidence_score: signalResult.confidence
              });
              
              if (evalResult.canProceed) approvalStatus = 'AUTO_APPROVED';
              else if (evalResult.escalationRequired === 'EXECUTIVE') approvalStatus = 'EXECUTIVE_APPROVAL_REQUIRED';
              else approvalStatus = 'MANAGER_APPROVAL_REQUIRED';
          } else {
              // Standard tasks can be auto-approved
              approvalStatus = 'AUTO_APPROVED';
          }

          const res = await db.query(`
              INSERT INTO public.predictive_interventions
              (source_type, source_id, action_type, description, confidence, recommended_playbook, approval_status, execution_status)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING *;
          `, [sourceType, sourceId, inv.action_type, inv.description, signalResult.confidence, inv.playbook, approvalStatus, 'DRAFT']);

          // If auto-approved, queue it
          if (approvalStatus === 'AUTO_APPROVED') {
              await this._queueTaskExecution(res.rows[0]);
          }
      }
  }

  async _queueTaskExecution(intervention) {
      // User mandate: Queue Tasks Only. Auto-Send Customer Communications ❌
      console.log(`[PredictiveEngine] Intervention ${intervention.id} queued. Status updated to QUEUED.`);
      await db.query(`UPDATE public.predictive_interventions SET execution_status = 'QUEUED' WHERE id = $1`, [intervention.id]);
      
      // In production, this would inject a task into the CS module or orchestrator queue.
  }

  // ============================================================================
  // 4. API READ ROUTES (Predictive Insights)
  // ============================================================================
  
  async getPredictiveInsights() {
      // Fetch latest unresolved anomalies
      const { rows: anomalies } = await db.query(`SELECT * FROM public.predictive_anomalies WHERE resolved = FALSE ORDER BY detected_at DESC LIMIT 10`);
      
      // Fetch high risk signals
      const { rows: churnRisks } = await db.query(`
          SELECT s.*, a.company_name, a.arr 
          FROM public.predictive_signals s
          JOIN public.customer_accounts a ON s.account_id = a.id
          WHERE s.signal_type = 'CHURN' AND s.risk_score >= 70
          ORDER BY s.created_at DESC LIMIT 10
      `);

      const { rows: expansionSignals } = await db.query(`
          SELECT s.*, a.company_name, a.arr 
          FROM public.predictive_signals s
          JOIN public.customer_accounts a ON s.account_id = a.id
          WHERE s.signal_type = 'EXPANSION' AND s.risk_score >= 70
          ORDER BY s.created_at DESC LIMIT 10
      `);

      // Fetch pending interventions
      const { rows: recommendations } = await db.query(`
          SELECT i.* 
          FROM public.predictive_interventions i
          WHERE i.execution_status IN ('DRAFT', 'QUEUED', 'PENDING')
          ORDER BY i.created_at DESC LIMIT 20
      `);

      return {
          anomalies,
          churnRisks,
          expansionSignals,
          recommendations,
          summary: {
              activeAnomalies: anomalies.length,
              highRiskAccounts: churnRisks.length,
              expansionOpportunities: expansionSignals.length,
              pendingApprovals: recommendations.filter(r => r.approval_status.includes('REQUIRED')).length
          }
      };
  }
}

module.exports = new PredictiveIntelligenceService();
