const db = require('./db');
async function run() {
  const rowCount = await db.pool.query('SELECT COUNT(*) FROM products');
  console.log('Product count:', rowCount.rows[0].count);
  
  const indexes = await db.pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename='products'");
  console.log('\nAll indexes:');
  indexes.rows.forEach(r => console.log(' ', r.indexname, '|', r.indexdef.substring(0, 60)));
  
  // Check if pg_trgm enabled
  const ext = await db.pool.query("SELECT * FROM pg_extension WHERE extname='pg_trgm'");
  console.log('\npg_trgm installed:', ext.rows.length > 0);
  
  // Table estimate
  const stats = await db.pool.query("SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname='products'");
  console.log('Table row estimate:', stats.rows[0].estimate);
  
  // POSITION() does NOT use GIN - must use LIKE or @@
  // Check LIKE plan
  const explain1 = await db.pool.query("EXPLAIN SELECT id, name, normalized_name FROM products WHERE normalized_name LIKE '%soap%'");
  console.log('\nLIKE soap plan:');
  explain1.rows.forEach(r => console.log(r['QUERY PLAN']));
  
  // Check POSITION() plan
  const explain2 = await db.pool.query("EXPLAIN SELECT id, name FROM products WHERE POSITION('soap' IN normalized_name) > 0");
  console.log('\nPOSITION soap plan:');
  explain2.rows.forEach(r => console.log(r['QUERY PLAN']));

  // Check enable_seqscan
  const seqscan = await db.pool.query("SHOW enable_seqscan");
  console.log('\nenable_seqscan:', seqscan.rows[0].enable_seqscan);
  
  // Check work_mem
  const wm = await db.pool.query("SHOW work_mem");
  console.log('work_mem:', wm.rows[0].work_mem);
  
  // Check effective_cache_size
  const ec = await db.pool.query("SHOW effective_cache_size");
  console.log('effective_cache_size:', ec.rows[0].effective_cache_size);

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
