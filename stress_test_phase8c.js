const db = require('./server/db');
const eventBus = require('./server/services/eventBus');
const { v4: uuidv4 } = require('uuid');

async function runStressTest() {
    console.log("================================================");
    console.log("Phase 8C Stress Test: 1,000+ Concurrent Events");
    console.log("================================================\n");

    try {
        eventBus.provider = 'LOCAL'; 
        await eventBus.init();

        const TOTAL_EVENTS = 1500;
        console.log(`Starting generation of ${TOTAL_EVENTS} events...`);
        
        const start = Date.now();
        const promises = [];

        // We batch them slightly to avoid completely blowing out the V8 memory / Node Event Loop in one tick
        const batchSize = 100;
        for (let i = 0; i < TOTAL_EVENTS; i += batchSize) {
            const batchPromises = [];
            for (let j = 0; j < batchSize && (i+j) < TOTAL_EVENTS; j++) {
                batchPromises.push(eventBus.publish({
                    eventId: uuidv4(),
                    eventType: 'STRESS_TEST_EVENT',
                    source: 'load_runner',
                    tenantId: 'tenant_stress',
                    payload: { index: i+j, ts: Date.now() }
                }));
            }
            // Await the batch to simulate extremely high, but realistic connection pool usage
            await Promise.all(batchPromises);
        }

        const duration = Date.now() - start;
        const throughput = (TOTAL_EVENTS / (duration / 1000)).toFixed(2);
        
        console.log("\n--- Stress Test Results ---");
        console.log(`Total Events: ${TOTAL_EVENTS}`);
        console.log(`Total Duration: ${duration}ms`);
        console.log(`Throughput: ${throughput} events/sec`);
        
        if (duration < 25000) {
            console.log("✅ PASS: Performance is within acceptable limits for a local tier connection.");
        } else {
            console.log("❌ FAIL: Performance degraded below SLA.");
        }

    } catch (err) {
        console.error("Stress Test Error:", err);
    } finally {
        process.exit();
    }
}

runStressTest();
