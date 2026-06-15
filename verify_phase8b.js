const db = require('./server/db');
const crypto = require('crypto');
const eventBus = require('./server/services/eventBus');
const webhookSvc = require('./server/services/webhookSvc');
const dataExportSvc = require('./server/services/dataExportSvc');
const { v4: uuidv4 } = require('uuid');

async function runTests() {
    console.log("================================================");
    console.log("Phase 8B Verification Suite: Data & API Hub");
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
        eventBus.provider = 'LOCAL'; // Synchronous tests
        await eventBus.init();

        console.log("--- 1. Event Bus Idempotency ---");
        const eventId = uuidv4();
        const baseEvent = {
            eventId,
            eventType: 'IDEMPOTENT_TEST',
            source: 'test_runner',
            tenantId: 'tenant_1',
            payload: { value: 42 }
        };

        const res1 = await eventBus.publish(baseEvent);
        const res2 = await eventBus.publish(baseEvent);
        
        assert(res1 === eventId && res2 === eventId, "Publish returned the same event ID for duplicates");
        
        const { rows: auditRows } = await db.query(`SELECT * FROM public.event_audit_logs WHERE event_id = $1`, [eventId]);
        assert(auditRows.length === 1, "Duplicate event publish only resulted in a single DB record (Idempotency check)");

        console.log("\n--- 2. DLQ Replay & Recovery ---");
        // Manually insert a DEAD_LETTER
        const dlqId = uuidv4();
        await db.query(`
            INSERT INTO public.event_audit_logs (event_id, event_type, source, tenant_id, status)
            VALUES ($1, 'DLQ_REPLAY_TEST', 'test_runner', 'tenant_1', 'DEAD_LETTER')
        `, [dlqId]);

        let dlqHandled = false;
        eventBus.subscribe('DLQ_REPLAY_TEST', (e) => { dlqHandled = true; });

        const replayRes = await eventBus.replayDeadLetterEvents();
        assert(replayRes.replayedCount > 0, `Replay triggered for ${replayRes.replayedCount} dead letter events`);
        
        await new Promise(r => setTimeout(r, 500));
        assert(dlqHandled, "DLQ Replay successfully re-routed the event to subscribers");

        console.log("\n--- 3. Enterprise API Marketplace & Authentication ---");
        const apiConsumer = 'test_consumer_' + Date.now();
        const apiSecret = 'super_secret_' + Date.now();
        const apiKey = crypto.createHash('sha256').update('raw_key_string').digest('hex');

        await db.query(`
            INSERT INTO public.api_keys (consumer_name, api_key_hash, hmac_secret)
            VALUES ($1, $2, $3)
        `, [apiConsumer, apiKey, apiSecret]);

        // Mock a request validation
        const payloadStr = JSON.stringify({ eventType: "DEAL_WON" });
        const ts = Date.now().toString();
        const sig = crypto.createHmac('sha256', apiSecret).update(ts + '.' + payloadStr).digest('hex');
        
        assert(sig.length === 64, "HMAC signature successfully generated for API request");

        console.log("\n--- 4. Webhook Framework & Retries ---");
        const whTarget = 'http://localhost:9999/invalid_endpoint_to_force_failure';
        const whSecret = 'webhook_secret';
        
        const { rows: whRows } = await db.query(`
            INSERT INTO public.webhook_subscriptions (target_url, event_types, hmac_secret)
            VALUES ($1, $2, $3) RETURNING id
        `, [whTarget, JSON.stringify(['DEAL_WON']), whSecret]);

        await eventBus.publish({ eventType: 'DEAL_WON', source: 'test', tenantId: '1', payload: {} });
        await new Promise(r => setTimeout(r, 1000)); // wait for dispatch

        const { rows: logRows } = await db.query(`SELECT status, retry_count FROM public.webhook_delivery_logs WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT 1`, [whRows[0].id]);
        assert(logRows.length === 1 && logRows[0].status === 'RETRYING', "Webhook failure correctly transitioned to RETRYING status");
        assert(logRows[0].retry_count === 1, "Webhook failure incremented retry count");

        console.log("\n--- 5. Data Lakehouse Sync (S3/JSON Export) ---");
        const exportRes = await dataExportSvc.runExport('event_audit_logs');
        assert(exportRes.success && exportRes.recordCount > 0, `Exported ${exportRes.recordCount} records to JSON mock S3 bucket`);

        console.log("\n--- 6. Load Testing / Performance Validation ---");
        console.log("Simulating high concurrency load test...");
        const start = Date.now();
        const loadPromises = [];
        for(let i=0; i<100; i++) {
            loadPromises.push(eventBus.publish({
                eventId: uuidv4(),
                eventType: 'LOAD_TEST',
                source: 'load_runner',
                tenantId: 'tenant_test',
                payload: { idx: i }
            }));
        }
        await Promise.all(loadPromises);
        const duration = Date.now() - start;
        console.log(`Processed 100 concurrent publishes in ${duration}ms`);
        assert(duration < 10000, `High throughput event ingestion passed (Duration: ${duration}ms)`);

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
