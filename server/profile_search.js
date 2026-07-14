const fs = require('fs');
const db = require('./db');
const { performance } = require('perf_hooks');

const targets = ['soap', 'necklace', 'coconut shell', 'terracotta'];
const debugFiles = fs.readdirSync(__dirname).filter(f => f.startsWith('search_debug_main_')).map(f => ({ name: f, time: fs.statSync(f).mtimeMs })).sort((a,b) => a.time - b.time);

const queries = {};
for (const t of targets) {
    for (let i = debugFiles.length - 1; i >= 0; i--) {
        const content = fs.readFileSync(debugFiles[i].name, 'utf8');
        if (content.includes(`"${t}"`) || content.includes(`"${t}%"`) || content.includes(`"%${t}%"`)) {
            queries[t] = JSON.parse(content);
            break;
        }
    }
}

async function runProfiles() {
    console.log("==================================================");
    console.log("PERFORMANCE PROFILING");
    console.log("==================================================\n");

    for (const t of targets) {
        if (!queries[t]) {
            console.log(`No query found for ${t}`);
            continue;
        }
        const { queryText, params } = queries[t];
        
        console.log(`Target: ${t}`);
        
        const t0 = performance.now();
        
        // 2. Query normalization
        const normalizeSearch = (value) => value.toString().toLowerCase().replace(/\bkottravai\b/g, ' ').replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
        const normalizedQuery = normalizeSearch(t);
        const searchTokens = normalizedQuery.split(' ').filter(Boolean);
        const t1 = performance.now();
        
        // 3. SQL execution
        let sqlExecTime = 0;
        try {
            const explain = await db.pool.query('EXPLAIN (ANALYZE, FORMAT JSON) ' + queryText, params);
            sqlExecTime = explain.rows[0]['QUERY PLAN'][0]['Execution Time'];
        } catch(e) {
            console.error("Explain error", e);
        }
        
        const t2 = performance.now();
        const result = await db.pool.query(queryText, params);
        const t3 = performance.now();
        
        // 4. PostgreSQL result fetch
        const dbTotal = t3 - t2;
        const fetchTime = Math.max(0, dbTotal - sqlExecTime);
        
        // 5. Relevance mapping
        const t4 = performance.now();
        const mapped = result.rows.map(r => ({
            id: r.id, name: r.name, relevance: r.relevance, matched_field: r.matched_field,
            price_formatted: '₹' + r.price, image_url: r.image ? 'https://...' + r.image : null
        }));
        const t5 = performance.now();
        
        // 6. JSON serialization
        const jsonStr = JSON.stringify(result.rows);
        const t6 = performance.now();
        
        const t7 = performance.now();
        
        console.log(`1. Request received: 0.00 ms (Baseline)`);
        console.log(`2. Query normalization: ${(t1 - t0).toFixed(2)} ms`);
        console.log(`3. SQL execution: ${sqlExecTime.toFixed(2)} ms`);
        console.log(`4. PostgreSQL result fetch: ${fetchTime.toFixed(2)} ms`);
        console.log(`5. Relevance mapping / Formatting: ${(t5 - t4).toFixed(2)} ms`);
        console.log(`6. JSON serialization: ${(t6 - t5).toFixed(2)} ms`);
        console.log(`7. Response sent: ${(t7 - t6).toFixed(2)} ms`);
        
        const nodeTime = (t1-t0) + (t5-t4) + (t6-t5) + (t7-t6);
        const totalReq = (t7-t0) + dbTotal; // since EXPLAIN is an extra step not in normal request
        console.log(`\n--- Summary for '${t}' ---`);
        console.log(`Average SQL: ${sqlExecTime.toFixed(2)} ms`);
        console.log(`Node processing: ${nodeTime.toFixed(2)} ms`);
        console.log(`Total request: ${totalReq.toFixed(2)} ms\n`);
    }
    
    console.log("==================================================");
    console.log("CONNECTION POOL METRICS");
    console.log("==================================================");
    console.log(`Pool size: ${db.pool.totalCount}`);
    console.log(`Idle connections: ${db.pool.idleCount}`);
    console.log(`Waiting connections: ${db.pool.waitingCount}`);
    
    const acqStart = performance.now();
    const client = await db.pool.connect();
    const acqEnd = performance.now();
    console.log(`Acquire time: ${(acqEnd - acqStart).toFixed(2)} ms`);
    client.release();
    
    process.exit(0);
}

runProfiles();
