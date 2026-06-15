const db = require('../../db');
const eventBus = require('../eventBus');

/**
 * ReputationEngine – Phase 10B
 *
 * Tracks historical accuracy per agent_role + domain.
 * Applies asymmetrical reward/penalty rules based on outcome results.
 * Implements diminishing returns so reputation growth stabilises over time.
 * Emits REPUTATION_UPDATED for observability after each adjustment.
 */
class ReputationEngine {
    constructor() {
        // Asymmetrical scoring deltas (Base values before diminishing-returns curve)
        this.scoring = {
            MAJORITY_CORRECT:    +4,   // Agreed, and outcome was SUCCESS
            MAJORITY_INCORRECT:  -3,   // Agreed, but outcome was FAILURE
            DISSENT_VALIDATED:   +10,  // Challenged, and outcome was FAILURE (correct prediction)
            DISSENT_INCORRECT:   -1,   // Challenged, but outcome was SUCCESS
        };

        this._initListeners();
    }

    _initListeners() {
        eventBus.subscribe('OUTCOME_FINALIZED', async (event) => this.handleOutcomeFinalized(event));
    }

    // ─── Main Entry Point ────────────────────────────────────────────────────

    async handleOutcomeFinalized(event) {
        const { payload } = event;
        const { sagaId, outcomeId, classification, tenantId } = payload;

        if (classification === 'NEUTRAL' || classification === 'INCONCLUSIVE') {
            // No reputation change for ambiguous outcomes
            return;
        }

        const decision = await this._getDecision(sagaId);
        if (!decision) return;

        const domain = decision.domain || 'Operational';
        const majority = decision.majority_positions || [];
        const minority = decision.minority_opinions || [];

        const isSuccess = classification === 'SUCCESS' || classification === 'PARTIAL_SUCCESS';
        const isFailure = classification === 'FAILURE';

        // Adjust majority participants
        for (const participant of majority) {
            const role = participant.role;
            if (!role) continue;

            const delta = isSuccess ? this.scoring.MAJORITY_CORRECT : this.scoring.MAJORITY_INCORRECT;
            const reason = isSuccess
                ? `Correctly supported a ${classification} outcome`
                : `Supported a decision that resulted in ${classification}`;

            await this._adjustReputation(tenantId, role, domain, delta, reason, outcomeId, {
                agent: role,
                outcome: classification,
                position: 'AGREE',
                adjustment: delta,
                reason
            });
        }

        // Adjust minority (dissenting) participants
        for (const dissenter of minority) {
            const role = dissenter.role;
            if (!role) continue;

            let delta, reason;
            if (isFailure) {
                delta = this.scoring.DISSENT_VALIDATED;
                reason = `Correctly predicted risk that resulted in ${classification}`;
            } else {
                delta = this.scoring.DISSENT_INCORRECT;
                reason = `Challenged a proposal that resulted in ${classification}`;
            }

            await this._adjustReputation(tenantId, role, domain, delta, reason, outcomeId, {
                agent: role,
                outcome: classification,
                position: 'CHALLENGE',
                adjustment: delta,
                reason
            });
        }
    }

    // ─── Weight Calculation for ConsensusEngine ───────────────────────────────

    /**
     * Returns normalised voting weights for an array of agent roles.
     * Each weight is clamped between MIN_INFLUENCE and MAX_INFLUENCE.
     * @param {string} tenantId
     * @param {string[]} roles  – array of agent role strings
     * @param {string} domain
     * @returns {Map<role, weight>} e.g. { FINANCE_AGENT: 0.32, SALES_AGENT: 0.40, ... }
     */
    async getWeights(tenantId, roles, domain) {
        const MIN_INFLUENCE = 0.10;
        const MAX_INFLUENCE = 0.40;
        const n = roles.length;

        // Step 1: read raw reputation scores
        const rawScores = new Map();
        for (const role of roles) {
            const score = await this._getReputationScore(tenantId, role, domain);
            rawScores.set(role, score);
        }

        // Step 2: two-pass proportional clamping
        //  Pass A – lock agents whose unconstrained proportion would violate a boundary.
        //  Pass B – distribute remaining weight budget among the free agents.
        const totalRaw = Array.from(rawScores.values()).reduce((a, b) => a + b, 0);
        const initial = new Map();
        for (const [role, score] of rawScores.entries()) {
            initial.set(role, totalRaw > 0 ? score / totalRaw : 1 / n);
        }

        const pinned  = new Map();   // role -> clamped weight (already decided)
        const free    = new Map();   // role -> unclamped proportion for redistribution

        for (const [role, w] of initial.entries()) {
            if (w >= MAX_INFLUENCE) { pinned.set(role, MAX_INFLUENCE); }
            else if (w <= MIN_INFLUENCE) { pinned.set(role, MIN_INFLUENCE); }
            else { free.set(role, w); }
        }

        const pinnedSum = Array.from(pinned.values()).reduce((a, b) => a + b, 0);
        const remaining = Math.max(0, 1.0 - pinnedSum);
        const freeRawSum = Array.from(free.values()).reduce((a, b) => a + b, 0);

        const weights = new Map(pinned);
        for (const [role, w] of free.entries()) {
            const proportional = freeRawSum > 0 ? (w / freeRawSum) * remaining : remaining / free.size;
            // Clamp the redistributed share as well
            weights.set(role, Math.max(MIN_INFLUENCE, Math.min(MAX_INFLUENCE, proportional)));
        }

        // Final normalise so weights sum exactly to 1.0 (floating-point safety)
        const finalTotal = Array.from(weights.values()).reduce((a, b) => a + b, 0);
        for (const [role, w] of weights.entries()) {
            weights.set(role, w / finalTotal);
        }

        return weights;
    }

    // ─── Internals ────────────────────────────────────────────────────────────

    async _getReputationScore(tenantId, agentRole, domain) {
        const { rows } = await db.query(`
            SELECT reputation_score
            FROM public.agent_reputations
            WHERE tenant_id = $1 AND agent_role = $2 AND domain = $3
        `, [tenantId, agentRole, domain]);

        return rows.length > 0 ? parseFloat(rows[0].reputation_score) : 50;
    }

    async _adjustReputation(tenantId, agentRole, domain, baseDelta, reason, outcomeId, explainability) {
        const currentScore = await this._getReputationScore(tenantId, agentRole, domain);

        // Diminishing returns: gain = baseDelta × (1 - score/100)
        // For penalties, use absolute value so the curve applies symmetrically
        const isGain = baseDelta > 0;
        const diminishFactor = isGain
            ? (1 - currentScore / 100)        // gains shrink as score climbs toward 100
            : (currentScore / 100);            // losses shrink as score approaches 0
        const adjustedDelta = baseDelta * diminishFactor;

        const newScore = Math.max(0, Math.min(100, currentScore + adjustedDelta));

        // Upsert reputation row
        await db.query(`
            INSERT INTO public.agent_reputations (tenant_id, agent_role, domain, reputation_score, total_evaluations, successful_predictions)
            VALUES ($1, $2, $3, $4, 1, $5)
            ON CONFLICT (tenant_id, agent_role, domain) DO UPDATE
              SET reputation_score       = $4,
                  total_evaluations      = agent_reputations.total_evaluations + 1,
                  successful_predictions = agent_reputations.successful_predictions + $5
        `, [tenantId, agentRole, domain, newScore.toFixed(2), isGain ? 1 : 0]);

        // Write audit history row
        await db.query(`
            INSERT INTO public.agent_reputation_history
              (tenant_id, agent_role, domain, old_score, new_score, reason, outcome_id, explainability)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            tenantId, agentRole, domain,
            currentScore.toFixed(2), newScore.toFixed(2),
            reason, outcomeId || null,
            JSON.stringify(explainability)
        ]);

        console.log(`[ReputationEngine] ${agentRole}/${domain}: ${currentScore.toFixed(1)} → ${newScore.toFixed(1)} (${baseDelta > 0 ? '+' : ''}${adjustedDelta.toFixed(2)}) — ${reason}`);

        // Observability event
        eventBus.publish({
            eventType: 'REPUTATION_UPDATED',
            tenantId,
            payload: {
                agentRole, domain,
                oldScore: parseFloat(currentScore.toFixed(2)),
                newScore: parseFloat(newScore.toFixed(2)),
                delta: parseFloat(adjustedDelta.toFixed(2)),
                reason,
                explainability
            },
            source: 'ReputationEngine'
        });
    }

    async _getDecision(sagaId) {
        const { rows } = await db.query(`
            SELECT state, final_recommendation, minority_opinions
            FROM public.swarm_decisions
            WHERE saga_id = $1
        `, [sagaId]);
        if (rows.length === 0) return null;

        const row = rows[0];
        return {
            domain: row.final_recommendation?.domain || 'Operational',
            minority_opinions: row.minority_opinions || [],
            // majority positions aren't stored natively; we reconstruct from final_recommendation
            majority_positions: row.final_recommendation?.majority || []
        };
    }
}

module.exports = new ReputationEngine();
