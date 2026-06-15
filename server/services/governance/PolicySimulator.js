const db = require('../../db');

/**
 * PolicySimulator – Phase 10C
 *
 * Replays historical finalized decisions against a proposed policy configuration
 * and measures the theoretical improvement in outcome quality.
 *
 * Currently supports simulation of THRESHOLD_ADJUSTMENT recommendations.
 * Each simulation run is persisted in public.policy_simulations for auditability.
 */
class PolicySimulator {

    /**
     * Simulate a governance recommendation against historical data.
     * @param {string} tenantId
     * @param {object} recommendation – row from governance_recommendations
     * @returns {object} simulation result record
     */
    async simulate(tenantId, recommendation) {
        console.log(`[PolicySimulator] Simulating recommendation ${recommendation.id} (${recommendation.recommendation_type})`);

        // Create a running simulation record
        const { rows: [simRow] } = await db.query(`
            INSERT INTO public.policy_simulations
              (tenant_id, recommendation_id, status)
            VALUES ($1, $2, 'RUNNING')
            RETURNING *
        `, [tenantId, recommendation.id]);
        const simId = simRow.id;

        try {
            let result;
            if (recommendation.recommendation_type === 'THRESHOLD_ADJUSTMENT') {
                result = await this._simulateThresholdAdjustment(tenantId, recommendation);
            } else {
                // Generic passthrough for non-threshold types – return baseline snapshot
                result = await this._simulateGenericPolicy(tenantId, recommendation);
            }

            // Persist result
            await db.query(`
                UPDATE public.policy_simulations SET
                    status                 = 'COMPLETE',
                    decisions_replayed     = $1,
                    outcomes_matched       = $2,
                    baseline_success_rate  = $3,
                    simulated_success_rate = $4,
                    improvement_pct        = $5,
                    simulation_report      = $6
                WHERE id = $7
            `, [
                result.decisionsReplayed,
                result.outcomesMatched,
                result.baselineSuccessRate,
                result.simulatedSuccessRate,
                result.improvementPct,
                JSON.stringify(result.report),
                simId
            ]);

            // Link simulation back to recommendation
            await db.query(`
                UPDATE public.governance_recommendations
                SET simulation_id = $1, status = 'SIMULATED'
                WHERE id = $2
            `, [simId, recommendation.id]);

            console.log(`[PolicySimulator] Simulation ${simId} complete. Projected improvement: ${result.improvementPct.toFixed(1)}%`);
            return { ...simRow, ...result, id: simId };

        } catch (err) {
            await db.query(`UPDATE public.policy_simulations SET status='FAILED' WHERE id=$1`, [simId]);
            throw err;
        }
    }

    // ─── Threshold Simulation ─────────────────────────────────────────────────

    async _simulateThresholdAdjustment(tenantId, recommendation) {
        const domain            = recommendation.target_domain;
        const currentThreshold  = recommendation.current_value?.threshold  ?? 0.75;
        const proposedThreshold = recommendation.proposed_value?.threshold ?? 0.85;

        // Fetch historical decisions in this domain with their outcome data
        const { rows: decisions } = await db.query(`
            SELECT
                sd.saga_id,
                sd.confidence_score,
                dout.classification,
                dout.outcome_score
            FROM public.swarm_decisions sd
            LEFT JOIN public.decision_outcomes dout ON sd.saga_id = dout.saga_id
            WHERE sd.tenant_id = $1
              AND (sd.final_recommendation->>'domain' = $2 OR $2 IS NULL)
              AND sd.state = 'CONSENSUS_REACHED'
              AND dout.status = 'FINALIZED'
        `, [tenantId, domain]);

        if (decisions.length === 0) {
            // No historical data to replay — return neutral result
            return {
                decisionsReplayed: 0,
                outcomesMatched: 0,
                baselineSuccessRate: 0,
                simulatedSuccessRate: 0,
                improvementPct: 0,
                report: { note: 'Insufficient historical data for simulation' }
            };
        }

        let baselineSuccesses   = 0;
        let simulatedSuccesses  = 0;
        const breakdown = [];

        for (const d of decisions) {
            const confidence = parseFloat(d.confidence_score) || 0;
            const isSuccess  = d.classification === 'SUCCESS' || d.classification === 'PARTIAL_SUCCESS';

            // Baseline: how many actually passed (confidence >= currentThreshold)
            const passedBaseline = confidence >= currentThreshold;

            // Simulation: with higher threshold, only decisions whose confidence
            // meets the stricter bar would have been approved.
            // Hypothesis: decisions that BARELY passed (confidence < proposedThreshold)
            // and went on to FAIL represent the "savings" from tightening.
            const passedSimulated = confidence >= proposedThreshold;

            if (passedBaseline && isSuccess) baselineSuccesses++;

            // Under the simulation, if a failing decision would have been BLOCKED
            // by the higher threshold, we count that as a simulated success
            // (avoided a bad outcome). Genuine successes that still pass are also counted.
            if (passedSimulated && isSuccess) simulatedSuccesses++;
            if (!passedSimulated && !isSuccess) simulatedSuccesses++; // correctly blocked failure

            breakdown.push({
                sagaId: d.saga_id,
                confidence,
                outcome: d.classification,
                wouldPassBaseline: passedBaseline,
                wouldPassSimulated: passedSimulated
            });
        }

        const n = decisions.length;
        const baselineRate    = n > 0 ? baselineSuccesses  / n : 0;
        const simulatedRate   = n > 0 ? simulatedSuccesses / n : 0;
        const improvementPct  = baselineRate > 0
            ? ((simulatedRate - baselineRate) / baselineRate) * 100
            : 0;

        return {
            decisionsReplayed:    n,
            outcomesMatched:      decisions.filter(d => d.classification !== null).length,
            baselineSuccessRate:  parseFloat((baselineRate   * 100).toFixed(2)),
            simulatedSuccessRate: parseFloat((simulatedRate  * 100).toFixed(2)),
            improvementPct:       parseFloat(improvementPct.toFixed(2)),
            report: {
                domain,
                currentThreshold,
                proposedThreshold,
                totalDecisions: n,
                breakdown: breakdown.slice(0, 20) // cap report payload size
            }
        };
    }

    // ─── Generic Policy Simulation ────────────────────────────────────────────

    async _simulateGenericPolicy(tenantId, recommendation) {
        // For non-threshold recommendations (e.g., RBAC_CHANGE), we cannot
        // deterministically replay. Instead we return a baseline snapshot.
        const { rows } = await db.query(`
            SELECT
                COUNT(*) FILTER (WHERE classification IN ('SUCCESS','PARTIAL_SUCCESS')) AS successes,
                COUNT(*) AS total
            FROM public.decision_outcomes
            WHERE tenant_id = $1 AND status = 'FINALIZED'
        `, [tenantId]);

        const total    = parseInt(rows[0]?.total    || 0);
        const successes = parseInt(rows[0]?.successes || 0);
        const rate = total > 0 ? successes / total : 0;

        return {
            decisionsReplayed:    total,
            outcomesMatched:      total,
            baselineSuccessRate:  parseFloat((rate * 100).toFixed(2)),
            simulatedSuccessRate: parseFloat((rate * 100).toFixed(2)), // unknown without replay
            improvementPct:       0,
            report: {
                note: `Generic simulation for ${recommendation.recommendation_type}. Manual evaluation required.`,
                baselineRate: rate
            }
        };
    }

    async getSimulation(simId) {
        const { rows } = await db.query(
            `SELECT * FROM public.policy_simulations WHERE id = $1`, [simId]
        );
        return rows[0];
    }
}

module.exports = new PolicySimulator();
