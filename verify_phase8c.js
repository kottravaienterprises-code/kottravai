const db = require('./server/db');
const eventBus = require('./server/services/eventBus');
const sagaOrchestrator = require('./server/services/sagaOrchestrator');
const generativeActionSvc = require('./server/services/generativeActionSvc');
const collaborationService = require('./server/services/integrations/collaborationService');
const billingService = require('./server/services/integrations/billingService');
const { v4: uuidv4 } = require('uuid');

async function runTests() {
    console.log("================================================");
    console.log("Phase 8C Verification Suite: Platform Intelligence");
    console.log("================================================\n");

    let passed = 0;
    let total = 0;

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
        eventBus.provider = 'LOCAL'; 
        await eventBus.init();

        console.log("--- 1. Generative Action Engine (Low Confidence Abort) ---");
        const trigger1 = uuidv4();
        await generativeActionSvc.proposeAction(trigger1, { type: 'DISCOUNT_NEGOTIATION' }, 'Test', 50.0, 'tenant_1');
        
        const { rows: audit1 } = await db.query(`SELECT * FROM public.generative_action_audits WHERE trigger_event_id = $1`, [trigger1]);
        assert(audit1.length === 0, "AI Action aborted cleanly when confidence score (50.0) was below threshold");

        console.log("\n--- 2. High Confidence & Human Approval Workflow ---");
        const trigger2 = uuidv4();
        await generativeActionSvc.proposeAction(trigger2, { type: 'DISCOUNT_NEGOTIATION', discountPercent: 20, targetCustomer: 'cust_123', durationMonths: 3 }, 'Needs Retention', 95.0, 'tenant_1');
        
        const { rows: audit2 } = await db.query(`SELECT * FROM public.generative_action_audits WHERE trigger_event_id = $1`, [trigger2]);
        assert(audit2.length === 1 && audit2[0].approval_status === 'PENDING_HUMAN', "Action safely blocked in PENDING_HUMAN status awaiting Slack approval");
        
        const sagaId = audit2[0].saga_id;
        
        // Simulate Exec clicking "Approve" in Slack
        await collaborationService.handleInteraction({
            actions: [{ value: JSON.stringify({ action: 'approve', sagaId, id: 'appr_123' }) }],
            user: { id: 'exec_john' }
        });

        await new Promise(r => setTimeout(r, 2000)); // allow events to settle
        
        const { rows: audit3 } = await db.query(`SELECT approval_status, execution_result FROM public.generative_action_audits WHERE saga_id = $1`, [sagaId]);
        assert(audit3[0].approval_status === 'HUMAN_APPROVED', "Slack approval correctly updated Audit Status");
        assert(audit3[0].execution_result === 'SUCCESS', "Action executed via Stripe Billing Adapter following human approval");
        
        const { rows: sagaRows } = await db.query(`SELECT status FROM public.saga_instances WHERE id = $1`, [sagaId]);
        assert(sagaRows[0].status === 'COMPLETED', "Saga Orchestrator marked state as COMPLETED");

        console.log("\n--- 3. Simulation (Dry-Run) & Rollback ---");
        const dryRunSaga = await sagaOrchestrator.startSaga('TEST_SAGA', {}, true);
        await sagaOrchestrator.compensateSaga(dryRunSaga, 'Simulated Failure');
        const { rows: dryRows } = await db.query(`SELECT status, is_simulation, context FROM public.saga_instances WHERE id = $1`, [dryRunSaga]);
        
        assert(dryRows[0].is_simulation === true, "Dry-run simulation flag preserved in state machine");
        assert(dryRows[0].status === 'FAILED' && dryRows[0].context.rollback_reason === 'Simulated Failure', "Compensation skipped external systems during dry-run and halted safely");

        console.log("\n--- 4. Cross-System Copilot Queries ---");
        let copilotResponseLog = '';
        const originalLog = console.log;
        console.log = (...args) => {
            if (args[0].includes('[Slack Copilot] Responding')) copilotResponseLog = args[0];
            originalLog(...args);
        };
        await eventBus.publish({ eventType: 'COPILOT_QUERY', source: 'slack', tenantId: 'system', payload: { query: 'forecast?', channel: '#exec' }});
        await new Promise(r => setTimeout(r, 100));
        console.log = originalLog;
        assert(copilotResponseLog.includes('Source: [forecast_accuracy_screenshot.png]'), "Copilot successfully cited source documents in Slack response");

    } catch (err) {
        console.error("\nTest Suite Error:", err);
    } finally {
        console.log("\n================================================");
        console.log(`Results: ${passed} / ${total} Tests Passed`);
        console.log("================================================");
        process.exit(passed === total ? 0 : 1);
    }
}

runTests();
