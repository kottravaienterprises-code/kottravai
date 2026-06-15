const db = require('./server/db');
const eventBus = require('./server/services/eventBus');
const vectorStore = require('./server/services/infrastructure/VectorStore');
const embeddingProvider = require('./server/services/infrastructure/EmbeddingProvider');
const ekgIngestionSvc = require('./server/services/ekg/EkgIngestionSvc');
const { v4: uuidv4 } = require('uuid');

async function runVerification() {
    console.log("================================================");
    console.log("Phase 9A: EKG Verification Suite");
    console.log("================================================\n");

    let passed = 0;
    let total = 0;
    const tenantId = 'tenant_verify';

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
        console.log("--- 1. Live Ingestion & Entity Deduplication ---");
        const accountId = `TestDedupe_Acct_${uuidv4()}`;
        
        // Ingest two deals for the same customer
        await ekgIngestionSvc.handleDealWon({ tenantId, eventId: uuidv4(), payload: { account: accountId, id: 'deal_1', value: 100 } });
        await ekgIngestionSvc.handleDealWon({ tenantId, eventId: uuidv4(), payload: { account: accountId, id: 'deal_2', value: 200 } });

        const { rows: nodes } = await db.query(`SELECT id, node_version FROM public.ekg_nodes WHERE tenant_id = $1 AND normalized_key = $2 ORDER BY node_version ASC`, [tenantId, `CUSTOMER:${accountId}`]);
        assert(nodes.length === 2, "Historical versions are retained in the DB");
        assert(nodes[1].node_version === 2, "Node version correctly incremented to 2");

        const { rows: activeNodes } = await db.query(`SELECT id FROM public.ekg_nodes WHERE tenant_id = $1 AND normalized_key = $2 AND valid_to IS NULL`, [tenantId, `CUSTOMER:${accountId}`]);
        assert(activeNodes.length === 1, "Entity Deduplication successful: Only one active node per normalized_key");

        console.log("\n--- 2. Graph Traversal & Provenance ---");
        const { rows: edges } = await db.query(`
            SELECT e.target_node_id, e.provenance_metadata 
            FROM public.ekg_edges e
            JOIN public.ekg_nodes n ON e.source_node_id = n.id
            WHERE n.normalized_key = $1
        `, [`CUSTOMER:${accountId}`]);
        assert(edges.length === 2, "Customer correctly linked to 2 distinct DEAL edges");
        assert(edges[0].provenance_metadata.source === 'EkgIngestionSvc', "Provenance metadata intact on generated edges");

        console.log("\n--- 3. Metadata-Filtered Vector Retrieval ---");
        const queryEmbedding = await embeddingProvider.generateEmbedding(`Historical deal 1 won for Acme Corp.`);
        const searchResults = await vectorStore.searchSimilarNodes('tenant_1', queryEmbedding, { nodeType: 'DEAL' }, 3);
        
        assert(searchResults.length > 0, "Hybrid vector retrieval returned results");
        assert(searchResults[0].node_type === 'DEAL', "Metadata filtering successfully restricted results to DEAL type");
        assert(searchResults[0].similarity_score > 0.8, "Cosine similarity successfully matched the semantic intent");

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
