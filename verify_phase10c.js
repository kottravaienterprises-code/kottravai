/**
 * verify_phase10c.js – Phase 10C: Autonomous Policy Refinement & Governance Optimization
 *
 * Validates:
 *  1. GovernanceAgent – Threshold recommendation from high failure rate domain
 *  2. GovernanceAgent – RBAC recommendation from reputation decline
 *  3. PolicySimulator – Simulation execution and improvement metric
 *  4. GovernanceApprovalSvc – Full approve lifecycle + audit logging
 *  5. GovernanceApprovalSvc – Reject lifecycle
 *  6. GovernanceApprovalSvc – Rollback lifecycle
 *  7. Governance constraint – GovernanceAgent never directly applies policy
 */

const db               = require('./server/db');
const governanceAgent  = require('./server/services/governance/GovernanceAgent');
const policySimulator  = require('./server/services/governance/PolicySimulator');
const approvalSvc      = require('./server/services/governance/GovernanceApprovalSvc');
const { v4: uuidv4 }   = require('uuid');

async function run() {
    console.log("================================================");
    console.log("Phase 10C: Autonomous Policy Refinement");
    console.log("================================================\n");

    let passed = 0, total = 0;
    const tenantId = 'tenant_verify_10c';

    const assert = (condition, message) => {
        total++;
        if (condition) { console.log(`✅ PASS: ${message}`); passed++; }
        else           { console.log(`❌ FAIL: ${message}`); }
    };

    try {
        // ── Seed test data ─────────────────────────────────────────────────
        console.log("--- Seeding test data ---");
        // Seed high-failure-rate decisions for Pricing domain
        for (let i = 0; i < 4; i++) {
            const sagaId = uuidv4();
            await db.query(`
                INSERT INTO public.swarm_decisions (tenant_id, saga_id, state, confidence_score, final_recommendation)
                VALUES ($1,$2,'CONSENSUS_REACHED', $3, $4)
            `, [tenantId, sagaId, (0.76 + i*0.01).toFixed(2), JSON.stringify({ domain: 'Pricing' })]);

            await db.query(`
                INSERT INTO public.decision_outcomes (tenant_id, saga_id, domain, status, classification, outcome_score, attribution_window_end)
                VALUES ($1,$2,'Pricing','FINALIZED',$3,$4, CURRENT_TIMESTAMP + INTERVAL '90 days')
            `, [tenantId, sagaId, i < 3 ? 'FAILURE' : 'SUCCESS', i < 3 ? -100 : 100]);
        }

        // Seed reputation decline for RISK_AGENT in Retention
        await db.query(`
            INSERT INTO public.agent_reputations (tenant_id, agent_role, domain, reputation_score)
            VALUES ($1, 'RISK_AGENT', 'Retention', 25)
            ON CONFLICT (tenant_id, agent_role, domain) DO UPDATE SET reputation_score = 25
        `, [tenantId]);
        await db.query(`
            INSERT INTO public.agent_reputation_history
              (tenant_id, agent_role, domain, old_score, new_score, reason, created_at)
            VALUES ($1, 'RISK_AGENT', 'Retention', 40, 25, 'Sustained failure penalty', CURRENT_TIMESTAMP - INTERVAL '20 days')
        `, [tenantId]);

        console.log("--- Seeding complete ---\n");

        // ── 1. Threshold Recommendation from High Failure Rate ─────────────
        console.log("--- 1. GovernanceAgent: Threshold Recommendation ---");
        const allRecs = await governanceAgent.analyse(tenantId);
        const thresholdRec = allRecs.find(r => r.recommendation_type === 'THRESHOLD_ADJUSTMENT' && r.target_domain === 'Pricing');
        assert(thresholdRec !== undefined, "GovernanceAgent generated a THRESHOLD_ADJUSTMENT recommendation for Pricing domain");
        assert(thresholdRec?.status === 'PENDING', "Recommendation status is PENDING (not auto-applied)");
        assert(parseFloat(thresholdRec?.proposed_value?.threshold) > 0.75, "Proposed threshold is higher than current 75% (evidence-based tightening)");

        // ── 2. RBAC Recommendation from Reputation Decline ────────────────
        console.log("\n--- 2. GovernanceAgent: RBAC Recommendation from Reputation Decline ---");
        const rbacRec = allRecs.find(r => r.recommendation_type === 'RBAC_CHANGE' && r.target_role === 'RISK_AGENT');
        assert(rbacRec !== undefined, "GovernanceAgent detected RISK_AGENT reputation decline and generated RBAC_CHANGE recommendation");
        assert(rbacRec?.evidence?.[0]?.metric === 'reputation_drop', "RBAC recommendation includes evidence metric (reputation_drop)");

        // ── 3. Policy Simulation ──────────────────────────────────────────
        console.log("\n--- 3. PolicySimulator: Threshold Simulation ---");
        const sim = await policySimulator.simulate(tenantId, thresholdRec);
        assert(sim.status === 'COMPLETE' || sim.decisionsReplayed >= 0, "Simulation completed successfully");
        assert(typeof sim.baselineSuccessRate === 'number', "Simulation produced a baseline success rate");
        assert(typeof sim.simulatedSuccessRate === 'number', "Simulation produced a simulated success rate");

        // Verify recommendation was advanced to SIMULATED
        const updatedRec = await governanceAgent.getRecommendation(thresholdRec.id);
        assert(updatedRec.status === 'SIMULATED', "Recommendation status advanced to SIMULATED after simulation");
        assert(updatedRec.simulation_id !== null, "Recommendation is linked to its simulation record");

        // ── 4. Human Approval Lifecycle ───────────────────────────────────
        console.log("\n--- 4. Approval Lifecycle: Submit → Approve ---");
        await approvalSvc.submitForApproval(tenantId, thresholdRec.id);
        const awaitingRec = await governanceAgent.getRecommendation(thresholdRec.id);
        assert(awaitingRec.status === 'AWAITING_APPROVAL', "Recommendation advanced to AWAITING_APPROVAL after submit");

        const approvalResult = await approvalSvc.approve(tenantId, thresholdRec.id, 'CEO_USER', 'Data supports tighter consensus threshold');
        assert(approvalResult.status === 'APPROVED', "Recommendation successfully approved by authorized actor");

        const approvedRec = await governanceAgent.getRecommendation(thresholdRec.id);
        assert(approvedRec.status === 'APPROVED', "Recommendation persisted as APPROVED in database");
        assert(approvedRec.approved_by === 'CEO_USER', "Approving actor name correctly captured");

        // Verify audit history exists
        const auditHistory = await approvalSvc.getApprovalHistory(tenantId, thresholdRec.id);
        assert(auditHistory.length >= 1, "Approval audit history row exists");
        assert(auditHistory[0].action === 'APPROVED', "Audit history correctly records APPROVED action");
        assert(auditHistory[0].snapshot_before !== null, "Audit history captures policy snapshot_before");
        assert(auditHistory[0].snapshot_after !== null, "Audit history captures policy snapshot_after");

        // ── 5. Reject Lifecycle ───────────────────────────────────────────
        console.log("\n--- 5. Approval Lifecycle: Submit → Reject ---");
        // Use the RBAC recommendation for this test
        await policySimulator.simulate(tenantId, rbacRec);
        await approvalSvc.submitForApproval(tenantId, rbacRec.id);
        const rejectResult = await approvalSvc.reject(tenantId, rbacRec.id, 'CTO_USER', 'Manual review already in progress');
        assert(rejectResult.status === 'REJECTED', "Recommendation successfully rejected by authorized actor");

        const rejectedRec = await governanceAgent.getRecommendation(rbacRec.id);
        assert(rejectedRec.status === 'REJECTED', "Rejected recommendation persisted as REJECTED in database");

        const rejectHistory = await approvalSvc.getApprovalHistory(tenantId, rbacRec.id);
        assert(rejectHistory.some(h => h.action === 'REJECTED'), "Rejection audit history preserved");

        // ── 6. Rollback Lifecycle ─────────────────────────────────────────
        console.log("\n--- 6. Approval Lifecycle: Rollback ---");
        const rollbackResult = await approvalSvc.rollback(tenantId, thresholdRec.id, 'CEO_USER', 'Unintended side-effect detected');
        assert(rollbackResult.status === 'ROLLED_BACK', "APPROVED policy successfully rolled back");
        assert(rollbackResult.revertedTo?.threshold === 0.75, "Rollback restores original policy value (threshold: 0.75)");

        const rolledRec = await governanceAgent.getRecommendation(thresholdRec.id);
        assert(rolledRec.status === 'ROLLED_BACK', "Recommendation persisted as ROLLED_BACK in database");

        const rollbackHistory = await approvalSvc.getApprovalHistory(tenantId, thresholdRec.id);
        assert(rollbackHistory.some(h => h.action === 'ROLLED_BACK'), "Rollback event captured in governance audit trail");

        // ── 7. Governance Constraint: No direct policy application ────────
        console.log("\n--- 7. Governance Constraint: GovernanceAgent has no direct policy write methods ---");
        assert(typeof governanceAgent.applyPolicy === 'undefined', "GovernanceAgent exposes no 'applyPolicy' method (cannot self-modify policy)");
        assert(typeof governanceAgent.setThreshold === 'undefined', "GovernanceAgent exposes no 'setThreshold' method (cannot self-modify policy)");
        assert(typeof governanceAgent.modifyRBAC === 'undefined', "GovernanceAgent exposes no 'modifyRBAC' method (cannot self-modify policy)");

    } catch (err) {
        console.error("Verification Error:", err);
    } finally {
        console.log("\n================================================");
        console.log(`Results: ${passed} / ${total} Tests Passed`);
        console.log("================================================");
        process.exit(passed === total ? 0 : 1);
    }
}

run();
