const db = require('../db');
const aiProvider = require('./aiProvider');
const revenueIntel = require('./revenueIntelligenceService');
const forecastSvc = require('./revenueForecastService');

class RevenueSimulationService {
    
    /**
     * Run a purely mathematical projection based on scenario variables.
     */
    async runSimulation(variables, req) {
        // Fetch current baseline
        const overview = await revenueIntel.getRevenueOverview(req);
        
        const currentARR = overview.totalARR || 0;
        const currentMRR = overview.totalMRR || 0;
        const currentNRR = overview.netRetentionRate || 100;
        const currentGRR = overview.grossRetentionRate || 95;
        const currentChurn = overview.churnRate || 5;

        // Extract variables (default to baseline if not provided)
        const targetArrGrowth = variables.targetArrGrowth !== undefined ? variables.targetArrGrowth : 20; // +20% default
        const churnRateModifier = variables.churnRateModifier !== undefined ? variables.churnRateModifier : 0; // +/- percentage points
        const dealSizeModifier = variables.dealSizeModifier !== undefined ? variables.dealSizeModifier : 0; // % increase/decrease
        const winRateModifier = variables.winRateModifier !== undefined ? variables.winRateModifier : 0; // percentage points

        // Calculate projections
        const projectedARR = currentARR * (1 + (targetArrGrowth / 100));
        const projectedMRR = projectedARR / 12;
        
        // Churn projection
        let projectedChurn = currentChurn + churnRateModifier;
        if (projectedChurn < 0) projectedChurn = 0;
        
        // GRR & NRR
        const projectedGRR = 100 - projectedChurn;
        // Simplified NRR assuming expansion grows proportionally with ARR target
        const expansionImpact = variables.expansionRevenueGrowth !== undefined ? variables.expansionRevenueGrowth : 0;
        const projectedNRR = projectedGRR + (currentNRR - currentGRR) * (1 + (expansionImpact / 100));

        // Pipeline Coverage
        const currentCoverage = 3.5; // Stubbed, usually from forecastSvc
        const pipelineModifier = variables.pipelineVelocityModifier !== undefined ? variables.pipelineVelocityModifier : 0; // %
        const projectedCoverage = currentCoverage * (1 + (pipelineModifier / 100));

        return {
            baseline: {
                arr: currentARR,
                mrr: currentMRR,
                nrr: currentNRR,
                grr: currentGRR,
                churn: currentChurn,
                coverage: currentCoverage
            },
            projected: {
                arr: projectedARR,
                mrr: projectedMRR,
                nrr: projectedNRR,
                grr: projectedGRR,
                churn: projectedChurn,
                coverage: projectedCoverage,
                confidence: 85 - (Math.abs(targetArrGrowth) * 0.2) // Simple confidence degradation for aggressive targets
            }
        };
    }

    /**
     * Use AI to explain the strategic impact of the simulation
     */
    async generateStrategicAnalysis(variables, projectionResults) {
        const prompt = `
You are an expert Chief Revenue Officer (CRO) AI Copilot for a B2B SaaS company.
Analyze the following strategic planning scenario and its projected outcomes.

Variables applied:
${JSON.stringify(variables, null, 2)}

Baseline vs Projected Results:
${JSON.stringify(projectionResults, null, 2)}

Generate a highly strategic, board-ready analysis strictly in the following JSON format:
{
  "executiveSummary": "A 2-3 sentence summary of the scenario's viability.",
  "keyAssumptions": ["Assumption 1", "Assumption 2"],
  "projectedOutcomes": ["Outcome 1", "Outcome 2"],
  "risks": ["Risk 1", "Risk 2"],
  "opportunities": ["Opportunity 1", "Opportunity 2"],
  "recommendedActions": ["Action 1", "Action 2"],
  "confidence": 85
}
Ensure the output is valid JSON without markdown wrapping.`;

        try {
            const aiResponse = await aiProvider.generateContent('', prompt);
            const rawText = aiResponse.text || '';
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Failed to parse AI response as JSON');
        } catch (err) {
            console.error('[RevenueSimulationService] AI Generation Error:', err);
            return {
                executiveSummary: "Analysis generation failed due to a system error.",
                keyAssumptions: [], projectedOutcomes: [], risks: [], opportunities: [], recommendedActions: [],
                confidence: 0
            };
        }
    }

    /**
     * Persistence Layer
     */
    async saveScenario(req, name, description, variables, results, aiAnalysis, status = 'DRAFT') {
        const userId = req.adminUser ? req.adminUser.id : null;
        const { rows } = await db.query(`
            INSERT INTO public.revenue_scenarios 
            (name, description, created_by, variables, projection_results, ai_analysis, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [name, description, userId, JSON.stringify(variables), JSON.stringify(results), JSON.stringify(aiAnalysis), status]);
        return rows[0];
    }

    async getHistory(statusFilter = null) {
        let query = `SELECT * FROM public.revenue_scenarios`;
        const params = [];
        if (statusFilter) {
            query += ` WHERE status = $1`;
            params.push(statusFilter);
        }
        query += ` ORDER BY updated_at DESC`;
        
        const { rows } = await db.query(query, params);
        return rows;
    }

    async getScenario(id) {
        const { rows } = await db.query(`SELECT * FROM public.revenue_scenarios WHERE id = $1`, [id]);
        return rows[0];
    }

    async updateStatus(id, newStatus) {
        const { rows } = await db.query(`
            UPDATE public.revenue_scenarios 
            SET status = $1
            WHERE id = $2
            RETURNING *
        `, [newStatus, id]);
        return rows[0];
    }
}

module.exports = new RevenueSimulationService();
