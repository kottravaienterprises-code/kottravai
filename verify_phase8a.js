const db = require('./server/db');
const eventBus = require('./server/services/eventBus');
const billingService = require('./server/services/integrations/billingService');
const collaborationService = require('./server/services/integrations/collaborationService');

async function runTests() {
    console.log("================================================");
    console.log("Phase 8A Verification Suite: Integrations & Streaming");
    console.log("================================================\n");

    let passed = 0;
    let total = 0;

    eventBus.provider = 'LOCAL';
    await eventBus.init();

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
        console.log("--- 1. Event Bus Foundation ---");
        
        let subCalled = false;
        eventBus.subscribe('TEST_EVENT', (event) => {
            subCalled = true;
        });

        const eventId = await eventBus.publish({
            eventType: 'TEST_EVENT',
            source: 'test_suite',
            tenantId: 'tenant_123',
            payload: { message: 'hello world' }
        });

        assert(eventId, "Event published and received an ID");
        
        // Wait for Postgres notification
        await new Promise(r => setTimeout(r, 1000));
        assert(subCalled, "Event subscription handler was triggered");

        // Verify Audit Log
        const { rows } = await db.query(`SELECT * FROM public.event_audit_logs WHERE event_id = $1`, [eventId]);
        assert(rows.length === 1, "Event successfully recorded in audit logs");
        assert(rows[0].status === 'PROCESSED' || rows[0].status === 'PUBLISHED', "Event status is correctly tracked");

        console.log("\n--- 2. Stripe Billing Integration ---");
        let paymentFailedSubCalled = false;
        eventBus.subscribe('PAYMENT_FAILED', (event) => {
            paymentFailedSubCalled = true;
        });

        // Mock Stripe Webhook
        await billingService.processStripeWebhook({
            type: 'invoice.payment_failed',
            data: {
                object: {
                    id: 'in_12345',
                    customer: 'cus_67890',
                    amount_due: 5000,
                    currency: 'usd'
                }
            }
        });

        await new Promise(r => setTimeout(r, 1000));
        assert(paymentFailedSubCalled, "Stripe webhook correctly parsed and published PAYMENT_FAILED event");

        console.log("\n--- 3. Slack Collaboration Integration ---");
        let approvalSent = false;
        
        // Spy on sendApprovalMessage
        const origSendApproval = collaborationService.sendApprovalMessage;
        collaborationService.sendApprovalMessage = async (payload) => {
            approvalSent = true;
            return { ok: true };
        };

        await eventBus.publish({
            eventType: 'APPROVAL_REQUIRED',
            source: 'system',
            tenantId: 'tenant_123',
            payload: { actionType: 'DISCOUNT', description: '20% off', requester: 'John Doe', id: 'app_1' }
        });

        await new Promise(r => setTimeout(r, 1000));
        assert(approvalSent, "Slack adapter correctly received and routed APPROVAL_REQUIRED event");

        console.log("\n--- 4. End-to-End: DEAL_WON Flow ---");
        let alertSent = false;
        const origSendAlert = collaborationService.sendAlert;
        collaborationService.sendAlert = async (channel, message) => {
            if (channel === '#sales-wins') alertSent = true;
            return { ok: true };
        };

        const e2eEventId = await eventBus.publish({
            eventType: 'DEAL_WON',
            source: 'crm',
            tenantId: 'tenant_123',
            payload: { account: 'Acme Corp', value: 100000, owner: 'Jane Smith' }
        });

        await new Promise(r => setTimeout(r, 1000));
        
        const auditE2E = await db.query(`SELECT status FROM public.event_audit_logs WHERE event_id = $1`, [e2eEventId]);
        assert(auditE2E.rows.length === 1 && (auditE2E.rows[0].status === 'PROCESSED' || auditE2E.rows[0].status === 'PUBLISHED'), "E2E: Deal Won event successfully audited and processed");
        assert(alertSent, "E2E: Slack alert correctly triggered for major deal win");

    } catch (err) {
        console.error("\nTest Suite Error:", err);
    } finally {
        console.log("\n================================================");
        console.log(`Results: ${passed} / ${total} Tests Passed`);
        console.log("================================================");
        process.exit(passed === total ? 0 : 1);
    }
}

// We need to require services so they attach their subscriptions
require('./server/services/integrations/collaborationService');

runTests();
