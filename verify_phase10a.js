const db = require('./server/db');
const eventBus = require('./server/services/eventBus');
const outcomeTracker = require('./server/services/learning/OutcomeTrackerSvc');
const sweeper = require('./server/services/learning/AttributionSweeper');
const { v4: uuidv4 } = require('uuid');

async function runVerification() {
    console.log("================================================");
    console.log("Phase 10A: Outcome Measurement Verification");
    console.log("================================================\n");

    let passed = 0;
    let total = 0;
    const tenantId = 'tenant_verify_10a';

    const assert = (condition, message) => {
        total++;
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passed++;
        } else {
            console.log(`❌ FAIL: ${message}`);
        }
    };

    try {
        console.log("--- 1. Initialization & Direct Saga Correlation ---");
        const sagaId1 = uuidv4();
        
        // Simulate a decision finalizing from ConsensusEngine
        await outcomeTracker.handleDecisionFinalized({
            eventType: 'DECISION_FINALIZED',
            tenantId,
            payload: { sagaId: sagaId1, state: 'CONSENSUS_REACHED', confidence: 0.9, domain: 'Pricing' },
            source: 'TestHarness'
        });

        let { rows } = await db.query(`SELECT * FROM public.decision_outcomes WHERE saga_id = $1`, [sagaId1]);
        assert(rows.length === 1 && rows[0].status === 'PENDING', "OutcomeTracker initialized a PENDING record for the decision");
        
        // Simulate a lagging indicator event with direct correlation
        await outcomeTracker.handleLaggingOutcome({
            eventType: 'DEAL_WON',
            tenantId,
            payload: { sagaId: sagaId1, amount: 50000 },
            source: 'TestHarness'
        });

        rows = (await db.query(`SELECT * FROM public.decision_outcomes WHERE saga_id = $1`, [sagaId1])).rows;
        assert(rows[0] && (rows[0].status === 'UNDER_EVALUATION' || rows[0].status === 'FINALIZED'), "OutcomeTracker successfully processed the lagging indicator");
        assert(rows[0] && rows[0].correlation_method === 'DIRECT_SAGA', "Correlation method was correctly tagged as DIRECT_SAGA");

        console.log("\n--- 2. Multi-Event Aggregation & Scoring ---");
        const sagaId2 = uuidv4();
        await outcomeTracker.handleDecisionFinalized({
            eventType: 'DECISION_FINALIZED',
            tenantId,
            payload: { sagaId: sagaId2, state: 'CONSENSUS_REACHED', confidence: 0.8, domain: 'Retention' },
            source: 'TestHarness'
        });
        
        await outcomeTracker.handleLaggingOutcome({
            eventType: 'CUSTOMER_REMAINED_ACTIVE',
            tenantId,
            payload: { sagaId: sagaId2 },
            source: 'TestHarness'
        });
        
        rows = (await db.query(`SELECT * FROM public.decision_outcomes WHERE saga_id = $1`, [sagaId2])).rows;
        assert(rows[0] && rows[0].classification === 'PARTIAL_SUCCESS', "Single positive event classified as PARTIAL_SUCCESS");
        assert(rows[0] && rows[0].status === 'UNDER_EVALUATION', "Status transitioned to UNDER_EVALUATION, keeping window open");

        // Send a second event to hit the +100 cap
        await outcomeTracker.handleLaggingOutcome({
            eventType: 'INVOICE_PAID',
            tenantId,
            payload: { sagaId: sagaId2 },
            source: 'TestHarness'
        });
        
        rows = (await db.query(`SELECT * FROM public.decision_outcomes WHERE saga_id = $1`, [sagaId2])).rows;
        assert(rows[0] && rows[0].classification === 'SUCCESS', "Multi-event aggregation correctly updated classification to SUCCESS");
        assert(rows[0] && rows[0].status === 'FINALIZED', "Early-finalization logic sealed the outcome window");

        console.log("\n--- 3. EKG Fallback Correlation ---");
        const sagaId3 = uuidv4();
        // Insert a mock swarm decision representing the EKG memory
        await db.query(`
            INSERT INTO public.swarm_decisions (tenant_id, saga_id, state, final_recommendation, updated_at)
            VALUES ($1, $2, 'CONSENSUS_REACHED', '{"customer_id": "cust_12345"}', CURRENT_TIMESTAMP)
        `, [tenantId, sagaId3]);
        
        await outcomeTracker.handleDecisionFinalized({
            eventType: 'DECISION_FINALIZED',
            tenantId,
            payload: { sagaId: sagaId3, state: 'CONSENSUS_REACHED', confidence: 0.9, domain: 'Operational' },
            source: 'TestHarness'
        });

        // Fire an event WITH NO SAGA ID
        await outcomeTracker.handleLaggingOutcome({
            eventType: 'CUSTOMER_CHURNED',
            tenantId,
            payload: { customer_id: "cust_12345" },
            source: 'TestHarness'
        });

        rows = (await db.query(`SELECT * FROM public.decision_outcomes WHERE saga_id = $1`, [sagaId3])).rows;
        assert(rows[0] && rows[0].correlation_method === 'EKG_MATCH', "OutcomeTracker successfully utilized EKG fallback to find missing saga_id");
        assert(rows[0] && rows[0].classification === 'FAILURE', "Negative event was correctly mapped and scored");

        console.log("\n--- 4. Attribution Window Expiration Sweeper ---");
        const sagaId4 = uuidv4();
        await db.query(`
            INSERT INTO public.decision_outcomes 
            (tenant_id, saga_id, domain, status, classification, attribution_window_end)
            VALUES ($1, $2, 'Pricing', 'PENDING', 'INCONCLUSIVE', CURRENT_TIMESTAMP - INTERVAL '1 day')
        `, [tenantId, sagaId4]);

        await sweeper.sweepExpiredWindows();
        
        rows = (await db.query(`SELECT * FROM public.decision_outcomes WHERE saga_id = $1`, [sagaId4])).rows;
        assert(rows[0].status === 'FINALIZED', "Sweeper successfully transitioned expired window to FINALIZED");
        assert(rows[0].classification === 'NEUTRAL', "Expired decision correctly defaulted to NEUTRAL classification");

    } catch (err) {
        console.error("Verification Error:", err);
    } finally {
        console.log("\n================================================");
        console.log(`Results: ${passed} / ${total} Tests Passed`);
        console.log("================================================");
        process.exit(passed === total ? 0 : 1);
    }
}

runVerification();
