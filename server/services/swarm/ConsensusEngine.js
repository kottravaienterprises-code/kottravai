const db = require('../../db');

class ConsensusEngine {
    constructor() {
        // Default supermajority threshold (75%)
        this.defaultThreshold = 0.75;
    }

    /**
     * Initializes a new decision record in the database
     */
    async initializeDecision(tenantId, sagaId) {
        await db.query(`
            INSERT INTO public.swarm_decisions (tenant_id, saga_id, state)
            VALUES ($1, $2, 'PROPOSED')
            ON CONFLICT DO NOTHING
        `, [tenantId, sagaId]);
    }

    /**
     * Updates the state of the debate (PROPOSED, CHALLENGED, REVISED)
     */
    async transitionState(sagaId, newState) {
        await db.query(`
            UPDATE public.swarm_decisions SET state = $1
            WHERE saga_id = $2
        `, [newState, sagaId]);
    }

    /**
     * Evaluates the current state of agreement among active agents using
     * reputation-weighted voting (Phase 10B).
     * 
     * Formula: weightedAgreement = Sum(agreeWeights) / Sum(allWeights)
     * Influence: each agent is clamped to [10%, 40%] of total weight.
     * Threshold: 75% by default; 100% if COMPLIANCE_AGENT is present.
     *
     * @param {Array} agents   BaseAgent instances in the swarm
     * @param {Array} responses Agent response objects {action, role, confidence, reason}
     * @param {Object} currentProposal The active proposal
     */
    async evaluateConsensus(sagaId, tenantId, agents, responses, currentProposal) {
        if (!agents || agents.length === 0) return { reached: false };

        // Lazy-load to avoid circular dependency at module init time
        const reputationEngine = require('../learning/ReputationEngine');

        const domain = currentProposal?.domain || 'Operational';
        const roles = agents.map(a => a.agentRole);
        const weights = await reputationEngine.getWeights(tenantId, roles, domain);

        let agreedWeight = 0;
        let totalWeight   = 0;
        let totalConfidence = 0;
        const minorityOpinions = [];
        const majorityPositions = [];

        for (const response of responses) {
            totalConfidence += (response.confidence || 0.8);
            const agentWeight = weights.get(response.role) || (1 / roles.length);
            totalWeight += agentWeight;

            if (response.action === 'AGREE' || response.action === 'CONSENSUS_REACHED') {
                agreedWeight += agentWeight;
                majorityPositions.push({ role: response.role, agentId: response.agentId });
            } else if (response.action === 'REJECT' || response.action === 'CHALLENGE') {
                minorityOpinions.push({
                    agentId: response.agentId,
                    role: response.role,
                    reason: response.reason,
                    timestamp: new Date().toISOString()
                });
            }
        }

        const weightedAgreement = totalWeight > 0 ? agreedWeight / totalWeight : 0;
        const avgConfidence = responses.length > 0 ? totalConfidence / responses.length : 0;

        // Policy override: COMPLIANCE_AGENT requires unanimity
        const requiresUnanimity = agents.some(a => a.agentRole === 'COMPLIANCE_AGENT');
        const threshold = requiresUnanimity ? 1.0 : this.defaultThreshold;

        if (weightedAgreement >= threshold) {
            const enrichedProposal = {
                ...(currentProposal || {}),
                majority: majorityPositions,
                domain
            };
            await this._finalizeDecision(sagaId, 'CONSENSUS_REACHED', avgConfidence, enrichedProposal, minorityOpinions);
            return { reached: true, state: 'CONSENSUS_REACHED', minorityOpinions, avgConfidence, weightedAgreement };
        } else {
            return { reached: false, ratio: weightedAgreement, minorityOpinions };
        }
    }

    /**
     * Forcibly escalate a decision, preserving any dissent
     */
    async escalateDecision(sagaId, minorityOpinions, currentProposal) {
        await this._finalizeDecision(sagaId, 'ESCALATED_TO_HUMAN', 0.0, currentProposal, minorityOpinions);
    }

    async _finalizeDecision(sagaId, state, confidence, finalRecommendation, minorityOpinions) {
        await db.query(`
            UPDATE public.swarm_decisions 
            SET state = $1, confidence_score = $2, final_recommendation = $3, minority_opinions = $4
            WHERE saga_id = $5
        `, [state, confidence, JSON.stringify(finalRecommendation || {}), JSON.stringify(minorityOpinions || []), sagaId]);

        // Emit for Phase 10A Outcome Tracking
        const eventBus = require('../eventBus'); // dynamic require to avoid circular deps
        eventBus.publish({
            eventType: 'DECISION_FINALIZED',
            tenantId: 'system', // we might not have tenantId here easily, let's look it up or pass it.
            payload: {
                sagaId,
                state,
                confidence,
                recommendation: finalRecommendation,
                domain: finalRecommendation && finalRecommendation.domain ? finalRecommendation.domain : 'Operational' // Default to Operational
            },
            source: 'ConsensusEngine'
        });
    }
    
    async getDecisionContext(sagaId) {
        const { rows } = await db.query(`SELECT * FROM public.swarm_decisions WHERE saga_id = $1`, [sagaId]);
        return rows[0];
    }
}

module.exports = new ConsensusEngine();
