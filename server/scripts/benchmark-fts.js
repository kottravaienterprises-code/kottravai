const fs = require('fs');
const path = require('path');
const db = require('../db');

async function benchmark(query, params, name) {
    try {
        console.log(`\n--- BENCHMARK: ${name} ---`);
        const explainQuery = `EXPLAIN ANALYZE ${query}`;
        const res = await db.query(explainQuery, params);
        
        console.log(`[EXPLAIN ANALYZE]`);
        res.rows.forEach(r => console.log(r['QUERY PLAN']));
        
        const start = Date.now();
        const actualRes = await db.query(query, params);
        const time = Date.now() - start;
        console.log(`[EXECUTION] Returned ${actualRes.rows.length} rows in ${time}ms\n`);
        return time;
    } catch (err) {
        console.error(`Error in benchmark ${name}:`, err.message);
    }
}

async function run() {
    console.log('Starting FTS Benchmark & Migration Script...');

    const searchKeyword = 'coffee';

    // 1. Benchmark BEFORE
    const beforeQuery = `
        SELECT id, name, slug, price, image, category
        FROM products
        WHERE is_live = TRUE 
        AND (normalized_name ILIKE $1 OR normalized_category ILIKE $1 OR normalized_description ILIKE $1)
        ORDER BY created_at DESC LIMIT 12
    `;
    await benchmark(beforeQuery, [`%${searchKeyword}%`], "BEFORE FTS (ILIKE scan)");

    // 2. Run Migration
    console.log('\n--- RUNNING MIGRATION ---');
    try {
        const migrationSql = fs.readFileSync(path.join(__dirname, '../migrations/20260729_add_fts_search.sql'), 'utf-8');
        await db.query(migrationSql);
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }

    // 3. Benchmark AFTER
    const afterQuery = `
        SELECT id, name, slug, price, image, category,
               ts_rank(search_vector, websearch_to_tsquery('english', $1)) AS relevance
        FROM products
        WHERE is_live = TRUE AND search_vector @@ websearch_to_tsquery('english', $1)
        ORDER BY relevance DESC
        LIMIT 12
    `;
    await benchmark(afterQuery, [searchKeyword], "AFTER FTS (GIN Index)");

    console.log('Done.');
    process.exit(0);
}

run();
