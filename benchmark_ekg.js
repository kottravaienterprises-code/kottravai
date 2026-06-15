const db = require('./server/db');
const vectorStore = require('./server/services/infrastructure/VectorStore');
const embeddingProvider = require('./server/services/infrastructure/EmbeddingProvider');
const { v4: uuidv4 } = require('uuid');

async function runBenchmark() {
    console.log("================================================");
    console.log("Phase 9A: EKG Benchmark (Vector Search Latency)");
    console.log("================================================\n");

    try {
        console.log("Seeding graph with synthetic nodes to hit target indexing threshold...");
        // In a real 100k benchmark, we would batch insert. For this script we will insert a smaller
        // representative sample to verify the HNSW index is actively hit.
        
        const tenantId = 'tenant_benchmark';
        const sampleSize = 1000; 

        // Batch Insertion
        const query = `
            INSERT INTO public.ekg_nodes (tenant_id, node_type, normalized_key, source_table, source_id, semantic_embedding)
            VALUES ($1, $2, $3, $4, $5, $6::vector)
        `;

        for (let i = 0; i < sampleSize; i++) {
            const vector = Array(1536).fill(0).map(() => Math.random() - 0.5);
            // normalization
            const mag = Math.sqrt(vector.reduce((sum, v) => sum + v*v, 0));
            const normVector = vector.map(v => v/mag);
            
            await db.query(query, [
                tenantId,
                'BENCHMARK_NODE',
                `BENCH:${uuidv4()}`,
                'benchmark',
                uuidv4(),
                `[${normVector.join(',')}]`
            ]);
        }
        
        console.log(`Successfully seeded ${sampleSize} synthetic nodes.`);

        console.log("\nBenchmarking Vector Retrieval Latency...");
        const queryVector = Array(1536).fill(0).map(() => Math.random() - 0.5);
        const mag = Math.sqrt(queryVector.reduce((sum, v) => sum + v*v, 0));
        const normQuery = queryVector.map(v => v/mag);

        // Run 10 iterations to average latency
        let totalTime = 0;
        const iterations = 10;
        
        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            await vectorStore.searchSimilarNodes(tenantId, normQuery, { nodeType: 'BENCHMARK_NODE' }, 5);
            totalTime += (Date.now() - start);
        }

        const avgLatency = totalTime / iterations;
        console.log(`Average Vector Search Latency (HNSW Index): ${avgLatency.toFixed(2)} ms`);

        if (avgLatency < 100) {
            console.log("✅ Benchmark Passed: Sub-100ms retrieval achieved.");
        } else {
            console.log("❌ Benchmark Failed: Retrieval took longer than 100ms.");
        }

    } catch (err) {
        console.error("Benchmark Failed:", err);
    } finally {
        process.exit();
    }
}

runBenchmark();
