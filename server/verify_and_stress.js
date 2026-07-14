// Phase 8 + Phase 9: Fresh verification after new code deployed
const db = require('./db');
const { performance } = require('perf_hooks');
const http = require('http');
const fs = require('fs');

const PORT = 5004;
const BASE = `http://localhost:${PORT}`;

function fetchSearch(query, bypassCache = false) {
    return new Promise((resolve, reject) => {
        const t0 = performance.now();
        const path = bypassCache
            ? `/api/products?q=${encodeURIComponent(query)}&limit=50&_nc=${Date.now()}`
            : `/api/products?q=${encodeURIComponent(query)}&limit=50`;
        http.get(`${BASE}${path}`, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve({ time: performance.now() - t0, size: data.length, count: JSON.parse(data || '[]').length }));
        }).on('error', reject);
    });
}

async function run() {
    console.log('==================================================');
    console.log('PHASE 8 — EXPLAIN ANALYZE BUFFERS (Post-Optimization)');
    console.log('==================================================\n');

    const targets = ['soap', 'necklace', 'coffee mug', 'terracotta'];

    // First, trigger fresh searches to generate new debug files
    for (const t of targets) {
        await fetchSearch(t, true); // bypass cache
        await new Promise(r => setTimeout(r, 500));
    }

    // Small delay for files to be written
    await new Promise(r => setTimeout(r, 500));

    // Read freshest debug files
    const debugFiles = fs.readdirSync('.').filter(f => f.startsWith('search_debug_main_'))
        .map(f => ({ name: f, time: fs.statSync(f).mtimeMs })).sort((a, b) => b.time - a.time);

    const freshQueries = {};
    for (const t of targets) {
        for (const f of debugFiles) {
            try {
                const content = fs.readFileSync(f.name, 'utf8');
                const parsed = JSON.parse(content);
                if (!parsed.queryText) continue;
                const pstr = JSON.stringify(parsed.params);
                if (pstr.includes(JSON.stringify(t)) || pstr.includes(JSON.stringify(t + '%'))) {
                    freshQueries[t] = parsed;
                    break;
                }
            } catch (e) {}
        }
    }

    for (const t of targets) {
        const q = freshQueries[t];
        if (!q) { console.log(`[${t}] No fresh query found`); continue; }

        const usesLike = !q.queryText.includes("POSITION('");
        const usesNormalized = q.queryText.includes('normalized_name');

        const explain = await db.pool.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + q.queryText, q.params);
        const plan = explain.rows[0]['QUERY PLAN'][0];
        const scanTypes = getScan(plan.Plan);
        const indexesUsed = getIndexes(plan.Plan);
        const hasSeqScan = scanTypes.includes('Seq Scan');

        console.log(`[${t}]`);
        console.log(`  Uses LIKE (GIN-compatible): ${usesLike ? '✅' : '❌ Still using POSITION'}`);
        console.log(`  Uses normalized columns:    ${usesNormalized ? '✅' : '❌'}`);
        console.log(`  Execution Time:    ${plan['Execution Time'].toFixed(2)} ms`);
        console.log(`  Planning Time:     ${plan['Planning Time'].toFixed(2)} ms`);
        console.log(`  Scan Types:        ${[...new Set(scanTypes)].join(', ')}`);
        console.log(`  Indexes Used:      ${indexesUsed.length ? indexesUsed.join(', ') : 'none'}`);
        console.log(`  Sequential Scan:   ${hasSeqScan ? '⚠️ YES (small table - planner prefers seq scan)' : '✅ NO'}\n`);
    }

    console.log('==================================================');
    console.log('PHASE 9 — STRESS TEST (100 requests)');
    console.log('==================================================\n');

    // Cold (cache-bypass) measurements
    const coldTimes = [];
    console.log('Cold requests (cache bypassed, 10x per query)...');
    for (let i = 0; i < 10; i++) {
        for (const t of ['soap', 'necklace', 'coconut shell', 'terracotta', 'coffee mug',
            'planter', 'gift hamper', 'mug', 'necklace', 'soap']) {
            const r = await fetchSearch(t, true);
            coldTimes.push(r.time);
            await new Promise(x => setTimeout(x, 50));
        }
    }

    coldTimes.sort((a, b) => a - b);
    const coldAvg = coldTimes.reduce((a, b) => a + b, 0) / coldTimes.length;
    console.log('COLD (no cache) — 100 requests:');
    console.log(`  Average:    ${coldAvg.toFixed(1)} ms`);
    console.log(`  Median p50: ${coldTimes[49].toFixed(1)} ms`);
    console.log(`  p95:        ${coldTimes[94].toFixed(1)} ms`);
    console.log(`  p99:        ${coldTimes[98].toFixed(1)} ms`);
    console.log(`  Fastest:    ${coldTimes[0].toFixed(1)} ms`);
    console.log(`  Slowest:    ${coldTimes[99].toFixed(1)} ms`);

    // Warm (cached) measurements
    const warmTimes = [];
    console.log('\nWarm requests (cached, 100x "soap")...');
    for (let i = 0; i < 100; i++) {
        const r = await fetchSearch('soap');
        warmTimes.push(r.time);
        await new Promise(x => setTimeout(x, 5));
    }
    warmTimes.sort((a, b) => a - b);
    const warmAvg = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;
    console.log('WARM (cached):');
    console.log(`  Average:    ${warmAvg.toFixed(1)} ms`);
    console.log(`  Median p50: ${warmTimes[49].toFixed(1)} ms`);
    console.log(`  Fastest:    ${warmTimes[0].toFixed(1)} ms`);
    console.log(`  Slowest:    ${warmTimes[99].toFixed(1)} ms`);

    // Connection pool state
    console.log('\n==================================================');
    console.log('PHASE 5 — CONNECTION POOL');
    console.log('==================================================');
    const p = db.pool;
    console.log(`  max:          ${p.options.max}`);
    console.log(`  total:        ${p.totalCount}`);
    console.log(`  idle:         ${p.idleCount}`);
    console.log(`  waiting:      ${p.waitingCount}`);
    console.log(`  keepAlive:    ${p.options.keepAlive}`);
    const t0acq = performance.now();
    const client = await p.connect();
    console.log(`  acquireTime:  ${(performance.now() - t0acq).toFixed(2)} ms`);
    client.release();

    process.exit(0);
}

function getScan(node) {
    const t = [node['Node Type']];
    if (node.Plans) node.Plans.forEach(p => t.push(...getScan(p)));
    return t;
}
function getIndexes(node) {
    const idxs = [];
    if (node['Index Name']) idxs.push(node['Index Name']);
    if (node.Plans) node.Plans.forEach(p => getIndexes(p).forEach(i => idxs.push(i)));
    return idxs;
}

run().catch(e => { console.error(e); process.exit(1); });
