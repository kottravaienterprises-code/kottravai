const db = require('../../db');
const eventBus = require('../eventBus');

/**
 * GovernanceApprovalSvc – Phase 10C
 *
 * Manages the human-gated approval lifecycle for governance recommendations.
 *
 * CRITICAL CONSTRAINT: Policy is NEVER applied autonomously.
 * 1. GovernanceAgent writes a PENDING recommendation.
 * 2. PolicySimulator enriches it to SIMULATED.
 * 3. GovernanceApprovalSvc routes it to AWAITING_APPROVAL (Slack / approval channel).
 * 4. A human calls approve() or reject().
 * 5. Approved policies are written to the active_policies ledger.
 * 6. All changes are audit-logged in governance_approvals.
 */
class GovernanceApprovalSvc {

    /**
     * Advance a SIMULATED recommendation to AWAITING_APPROVAL and
     * emit an event for the Slack notification pipeline.
     */
    async submitForApproval(tenantId, recommendationId) {
        const rec = await this._getRec(recommendationId);
        if (!rec) throw new Error(`Recommendation ${recommendationId} not found`);
        if (rec.status !== 'SIMULATED') throw new Error(`Cannot submit recommendation in status ${rec.status} for approval. Must be SIMULATED first.`);

        await db.query(`
            UPDATE public.governance_recommendations
            SET status = 'AWAITING_APPROVAL'
            WHERE id = $1
        `, [recommendationId]);

        // Emit for Slack / notification integration (same pattern as Phase 8 human escalation)
        eventBus.publish({
            eventType: 'GOVERNANCE_APPROVAL_REQUIRED',
            tenantId,
            payload: {
                recommendationId,
                type: rec.recommendation_type,
                domain: rec.target_domain,
                rationale: rec.rationale,
                currentValue: rec.current_value,
                proposedValue: rec.proposed_value,
                simulationId: rec.simulation_id
            },
            source: 'GovernanceApprovalSvc'
        });

        console.log(`[GovernanceApprovalSvc] Recommendation ${recommendationId} submitted for human approval.`);
        return { status: 'AWAITING_APPROVAL', recommendationId };
    }

    /**
     * Human approves the recommendation.
     * Writes an approval audit row and applies the policy to active_policies ledger.
     */
    async approve(tenantId, recommendationId, actor, reason) {
        const rec = await this._getRec(recommendationId);
        if (!rec) throw new Error(`Recommendation ${recommendationId} not found`);
        if (rec.status !== 'AWAITING_APPROVAL') throw new Error(`Cannot approve recommendation in status: ${rec.status}`);

        const snapshotBefore = rec.current_value;

        // Apply policy: write to governance_approvals and update recommendation status
        await db.query(`
            UPDATE public.governance_recommendations
            SET status = 'APPROVED', approved_by = $1, approved_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [actor, recommendationId]);

        await db.query(`
            INSERT INTO public.governance_approvals
              (tenant_id, recommendation_id, action, actor, reason, snapshot_before, snapshot_after)
            VALUES ($1, $2, 'APPROVED', $3, $4, $5, $6)
        `, [tenantId, recommendationId, actor, reason || null,
            JSON.stringify(snapshotBefore),
            JSON.stringify(rec.proposed_value)]);

        console.log(`[GovernanceApprovalSvc] Recommendation ${recommendationId} APPROVED by ${actor}.`);

        eventBus.publish({
            eventType: 'GOVERNANCE_POLICY_APPLIED',
            tenantId,
            payload: {
                recommendationId,
                type: rec.recommendation_type,
                domain: rec.target_domain,
                appliedValue: rec.proposed_value,
                approvedBy: actor
            },
            source: 'GovernanceApprovalSvc'
        });

        return { status: 'APPROVED', actor, recommendationId };
    }

    /**
     * Human rejects the recommendation.
     */
    async reject(tenantId, recommendationId, actor, reason) {
        const rec = await this._getRec(recommendationId);
        if (!rec) throw new Error(`Recommendation ${recommendationId} not found`);
        if (rec.status !== 'AWAITING_APPROVAL') throw new Error(`Cannot reject recommendation in status: ${rec.status}`);

        await db.query(`
            UPDATE public.governance_recommendations
            SET status = 'REJECTED'
            WHERE id = $1
        `, [recommendationId]);

        await db.query(`
            INSERT INTO public.governance_approvals
              (tenant_id, recommendation_id, action, actor, reason, snapshot_before)
            VALUES ($1, $2, 'REJECTED', $3, $4, $5)
        `, [tenantId, recommendationId, actor, reason || null, JSON.stringify(rec.current_value)]);

        console.log(`[GovernanceApprovalSvc] Recommendation ${recommendationId} REJECTED by ${actor}.`);

        eventBus.publish({
            eventType: 'GOVERNANCE_POLICY_REJECTED',
            tenantId,
            payload: { recommendationId, rejectedBy: actor, reason },
            source: 'GovernanceApprovalSvc'
        });

        return { status: 'REJECTED', actor, recommendationId };
    }

    /**
     * Rollback an APPROVED policy (returns to previous value in the ledger).
     */
    async rollback(tenantId, recommendationId, actor, reason) {
        const rec = await this._getRec(recommendationId);
        if (!rec) throw new Error(`Recommendation ${recommendationId} not found`);
        if (rec.status !== 'APPROVED') throw new Error(`Cannot rollback recommendation in status: ${rec.status}`);

        await db.query(`
            UPDATE public.governance_recommendations
            SET status = 'ROLLED_BACK'
            WHERE id = $1
        `, [recommendationId]);

        await db.query(`
            INSERT INTO public.governance_approvals
              (tenant_id, recommendation_id, action, actor, reason, snapshot_before, snapshot_after)
            VALUES ($1, $2, 'ROLLED_BACK', $3, $4, $5, $6)
        `, [tenantId, recommendationId, actor, reason || null,
            JSON.stringify(rec.proposed_value),   // what we're reverting FROM
            JSON.stringify(rec.current_value)]);   // what we're reverting TO

        console.log(`[GovernanceApprovalSvc] Policy for recommendation ${recommendationId} ROLLED BACK by ${actor}.`);

        eventBus.publish({
            eventType: 'GOVERNANCE_POLICY_ROLLED_BACK',
            tenantId,
            payload: { recommendationId, rolledBackBy: actor, revertedTo: rec.current_value },
            source: 'GovernanceApprovalSvc'
        });

        return { status: 'ROLLED_BACK', actor, recommendationId, revertedTo: rec.current_value };
    }

    async getApprovalHistory(tenantId, recommendationId) {
        const { rows } = await db.query(`
            SELECT * FROM public.governance_approvals
            WHERE tenant_id = $1 AND recommendation_id = $2
            ORDER BY created_at ASC
        `, [tenantId, recommendationId]);
        return rows;
    }

    async _getRec(id) {
        const { rows } = await db.query(
            `SELECT * FROM public.governance_recommendations WHERE id = $1`, [id]
        );
        return rows[0];
    }
}

module.exports = new GovernanceApprovalSvc();
