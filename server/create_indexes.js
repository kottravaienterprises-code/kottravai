const db = require('./db');

(async()=>{
  try{
    console.log('Creating pg_trgm extension if missing...');
    await db.query("CREATE EXTENSION IF NOT EXISTS pg_trgm", []);

    console.log('Creating GIN trigram expression index on normalized name...');
    await db.query(`CREATE INDEX IF NOT EXISTS idx_products_normalized_name_trgm ON products USING gin (trim(regexp_replace(replace(lower(name), 'kottravai', ' '), '[^a-z0-9\\s]+', ' ', 'g')) gin_trgm_ops)`, []);

    console.log('Creating GIN trigram expression index on normalized category...');
    await db.query(`CREATE INDEX IF NOT EXISTS idx_products_normalized_category_trgm ON products USING gin (trim(regexp_replace(replace(lower(category), 'kottravai', ' '), '[^a-z0-9\\s]+', ' ', 'g')) gin_trgm_ops)`, []);

    console.log('Creating GIN trigram expression index on normalized description...');
    await db.query(`CREATE INDEX IF NOT EXISTS idx_products_normalized_description_trgm ON products USING gin (trim(regexp_replace(replace(lower(description), 'kottravai', ' '), '[^a-z0-9\\s]+', ' ', 'g')) gin_trgm_ops)`, []);

    console.log('Creating B-tree index on is_live...');
    await db.query(`CREATE INDEX IF NOT EXISTS idx_products_is_live ON products(is_live)`, []);

    console.log('Creating B-tree index on category_slug...');
    await db.query(`CREATE INDEX IF NOT EXISTS idx_products_category_slug ON products(category_slug)`, []);

    console.log('Creating B-tree index on created_at (DESC)...');
    await db.query(`CREATE INDEX IF NOT EXISTS idx_products_created_at_desc ON products(created_at DESC)`, []);

    console.log('Running ANALYZE on products...');
    await db.query('ANALYZE products', []);

    console.log('Index creation complete');
    process.exit(0);
  }catch(e){
    console.error('Index creation failed:', e.message);
    process.exit(1);
  }
})();
