const db = require('../../db');
const eventBus = require('../eventBus');

/**
 * GovernanceAgent – Phase 10C
 *
 * Analyses reputation trends, outcome data, and consensus effectiveness to
 * generate evidence-based policy recommendations.
 *
 * GOVERNANCE CONSTRAINT: This agent NEVER modifies any policy directly.
 * All recommendations are written to governance_recommendations with status
 * PENDING and must progress through GovernanceApprovalSvc + human sign-off.
 */
class GovernanceAgent {
    constructor() {
        // Thresholds that trigger a recommendation
        this.config = {
            failureRateWarning:   0.40, // >40% FAILURE decisions in a domain → tighten threshold
            failureRateCritical:  0.60, // >60% FAILURE decisions → recommend COMPLIANCE_AGENT addition
            reputationDropAlert:  10,   // avg reputation drop >10 pts over last 30 days
            minDecisionsToAnalyse: 3,   // don't recommend based on too little data
        };
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Run a full governance analysis cycle for a tenant.
     * Emits GOVERNANCE_RECOMMENDATIONS_READY when complete.
     */
    async analyse(tenantId) {
        console.log(`[GovernanceAgent] Starting governance analysis for ${tenantId}…`);
        const recommendations = [];

        const thresholdRecs   = await this._analyseOutcomesByDomain(tenantId);
        const reputationRecs  = await this._analyseReputationTrends(tenantId);

        recommendations.push(...thresholdRecs, ...reputationRecs);

        if (recommendations.length === 0) {
            console.log(`[GovernanceAgent] No policy adjustments recommended.`);
        } else {
            console.log(`[GovernanceAgent] ${recommendations.length} recommendation(s) generated.`);
        }

        eventBus.publish({
            eventType: 'GOVERNANCE_RECOMMENDATIONS_READY',
            tenantId,
            payload: { count: recommendations.length, recommendations },
            source: 'GovernanceAgent'
        });

        return recommendations;
    }

    // ─── Analysis Modules ─────────────────────────────────────────────────────

    /**
     * 1. Outcome-to-Policy Correlation
     * Examines recent decision outcomes per domain and recommends consensus
     * threshold tightening where failure rates are elevated.
     */
    async _analyseOutcomesByDomain(tenantId) {
        const { rows } = await db.query(`
            SELECT
                domain,
                COUNT(*) FILTER (WHERE classification = 'SUCCESS' OR classification = 'PARTIAL_SUCCESS') AS successes,
                COUNT(*) FILTER (WHERE classification = 'FAILURE') AS failures,
                COUNT(*) AS total
            FROM public.decision_outcomes
            WHERE tenant_id = $1
              AND status = 'FINALIZED'
              AND classification != 'NEUTRAL'
              AND classification != 'INCONCLUSIVE'
            GROUP BY domain
        `, [tenantId]);

        const recs = [];
        for (const row of rows) {
            if (parseInt(row.total) < this.config.minDecisionsToAnalyse) continue;

            const failureRate = parseInt(row.failures) / parseInt(row.total);
            if (failureRate <= this.config.failureRateWarning) continue;

            // Determine recommended threshold adjustment
            let proposedThreshold, rationale;
            if (failureRate > this.config.failureRateCritical) {
                proposedThreshold = 0.90;
                rationale = `Domain "${row.domain}" has a critical failure rate of ${(failureRate * 100).toFixed(1)}% (${row.failures}/${row.total} decisions). Recommend near-unanimous consensus threshold.`;
            } else {
                proposedThreshold = 0.85;
                rationale = `Domain "${row.domain}" failure rate is ${(failureRate * 100).toFixed(1)}% (${row.failures}/${row.total} decisions), above the ${(this.config.failureRateWarning * 100)}% warning threshold. Recommend tightening supermajority to 85%.`;
            }

            const rec = await this._writeRecommendation(tenantId, {
                recommendation_type: 'THRESHOLD_ADJUSTMENT',
                target_domain: row.domain,
                current_value: { threshold: 0.75 },
                proposed_value: { threshold: proposedThreshold },
                rationale,
                evidence: [{ metric: 'failure_rate', value: failureRate, period: 'all_time', decisions: parseInt(row.total) }]
            });
            recs.push(rec);
        }
        return recs;
    }

    /**
     * 2. Reputation Trend Analytics
     * Detects agent roles whose domain reputation is on a sustained decline,
     * and recommends RBAC review or mandatory training data refresh.
     */
    async _analyseReputationTrends(tenantId) {
        // Compare current reputation against reputation 30 days ago via history table
        const { rows } = await db.query(`
            SELECT
                h.agent_role,
                h.domain,
                MIN(h.old_score)                               AS score_30d_ago,
                (SELECT r.reputation_score
                 FROM public.agent_reputations r
                 WHERE r.tenant_id = h.tenant_id
                   AND r.agent_role = h.agent_role
                   AND r.domain = h.domain
                 LIMIT 1)                                       AS current_score
            FROM public.agent_reputation_history h
            WHERE h.tenant_id = $1
              AND h.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
            GROUP BY h.agent_role, h.domain, h.tenant_id
        `, [tenantId]);

        const recs = [];
        for (const row of rows) {
            if (!row.score_30d_ago || !row.current_score) continue;
            const drop = parseFloat(row.score_30d_ago) - parseFloat(row.current_score);
            if (drop < this.config.reputationDropAlert) continue;

            const rationale = `${row.agent_role} reputation in domain "${row.domain}" has declined ${drop.toFixed(1)} points over the last 30 days (${parseFloat(row.score_30d_ago).toFixed(1)} → ${parseFloat(row.current_score).toFixed(1)}). Recommend RBAC audit and knowledge refresh.`;

            const rec = await this._writeRecommendation(tenantId, {
                recommendation_type: 'RBAC_CHANGE',
                target_domain: row.domain,
                target_role: row.agent_role,
                current_value: { reputation: parseFloat(row.score_30d_ago) },
                proposed_value: { action: 'AUDIT_AND_REFRESH', min_reputation_threshold: 30 },
                rationale,
                evidence: [{ metric: 'reputation_drop', value: drop, period: '30d' }]
            });
            recs.push(rec);
        }
        return recs;
    }

    // ─── Persistence ──────────────────────────────────────────────────────────

    async _writeRecommendation(tenantId, data) {
        const { rows } = await db.query(`
            INSERT INTO public.governance_recommendations
              (tenant_id, recommendation_type, target_domain, target_role,
               current_value, proposed_value, rationale, evidence, status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING')
            RETURNING *
        `, [
            tenantId,
            data.recommendation_type,
            data.target_domain || null,
            data.target_role   || null,
            JSON.stringify(data.current_value),
            JSON.stringify(data.proposed_value),
            data.rationale,
            JSON.stringify(data.evidence || [])
        ]);

        console.log(`[GovernanceAgent] Recommendation created: ${data.recommendation_type} for ${data.target_domain || data.target_role}`);
        return rows[0];
    }

    // ─── Read helpers (used by tests & simulator) ─────────────────────────────

    async getRecommendation(id) {
        const { rows } = await db.query(
            `SELECT * FROM public.governance_recommendations WHERE id = $1`, [id]
        );
        return rows[0];
    }

    async getPendingRecommendations(tenantId) {
        const { rows } = await db.query(`
            SELECT * FROM public.governance_recommendations
            WHERE tenant_id = $1 AND status = 'PENDING'
            ORDER BY created_at DESC
        `, [tenantId]);
        return rows;
    }
}

module.exports = new GovernanceAgent();
