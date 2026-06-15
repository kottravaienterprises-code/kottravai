const db = require('./server/db');
const vectorStore = require('./server/services/infrastructure/VectorStore');
const embeddingProvider = require('./server/services/infrastructure/EmbeddingProvider');
const { v4: uuidv4 } = require('uuid');

async function runBackfill() {
    console.log("================================================");
    console.log("Phase 9A: EKG Historical Data Backfill");
    console.log("================================================\n");

    try {
        console.log("Starting backfill for historical anomalies...");
        
        // Let's generate some historical mock data to populate the graph
        const historicalAccounts = ['Acme Corp', 'Globex', 'Initech', 'Soylent'];
        
        for (const account of historicalAccounts) {
            const tenantId = 'tenant_1';
            const customerKey = `CUSTOMER:${account}`;
            
            // Upsert Customer
            const custCtx = `Historical Customer: ${account}.`;
            const custEmb = await embeddingProvider.generateEmbedding(custCtx);
            const customerNodeId = await vectorStore.upsertNode(
                tenantId, 'CUSTOMER', customerKey, 'historical_backfill', 'hist', { account }, custEmb
            );

            // Upsert 2 historical deals per customer
            for (let i = 1; i <= 2; i++) {
                const dealId = uuidv4();
                const dealCtx = `Historical deal ${i} won for ${account}.`;
                const dealEmb = await embeddingProvider.generateEmbedding(dealCtx);
                const dealNodeId = await vectorStore.upsertNode(
                    tenantId, 'DEAL', `DEAL:${dealId}`, 'historical_backfill', dealId, { account, historical: true }, dealEmb
                );

                await vectorStore.upsertEdge(
                    tenantId, customerNodeId, dealNodeId, 'WON_DEAL', 1.0, 100.0, { backfill: true }
                );
            }
        }

        console.log("Backfill completed successfully.");

    } catch (err) {
        console.error("Backfill Failed:", err);
    } finally {
        process.exit();
    }
}

runBackfill();
