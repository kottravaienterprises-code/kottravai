const db = require('./db');

(async()=>{
  try{
    console.log('Adding persisted normalized columns (if missing)...');
    await db.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS normalized_name text", []);
    await db.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS normalized_category text", []);
    await db.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS normalized_description text", []);

    console.log('Backfilling normalized columns (this may take a while)...');
    const normExpr = "trim(regexp_replace(replace(lower(coalesce(name,'')), 'kottravai', ' '), '[^a-z0-9\\s]+', ' ', 'g'))";
    const normCatExpr = "trim(regexp_replace(replace(lower(coalesce(category,'')), 'kottravai', ' '), '[^a-z0-9\\s]+', ' ', 'g'))";
    const normDescExpr = "trim(regexp_replace(replace(lower(coalesce(description,'')), 'kottravai', ' '), '[^a-z0-9\\s]+', ' ', 'g'))";

    await db.query(`UPDATE products SET normalized_name = ${normExpr} WHERE normalized_name IS NULL OR normalized_name = ''`, []);
    await db.query(`UPDATE products SET normalized_category = ${normCatExpr} WHERE normalized_category IS NULL OR normalized_category = ''`, []);
    await db.query(`UPDATE products SET normalized_description = ${normDescExpr} WHERE normalized_description IS NULL OR normalized_description = ''`, []);

    console.log('Creating trigger function to maintain normalized columns...');
    const fn = `
    CREATE OR REPLACE FUNCTION products_normalize_trigger() RETURNS trigger AS $$
    BEGIN
      NEW.normalized_name := trim(regexp_replace(replace(lower(coalesce(NEW.name,'')), 'kottravai', ' '), '[^a-z0-9\\s]+', ' ', 'g'));
      NEW.normalized_category := trim(regexp_replace(replace(lower(coalesce(NEW.category,'')), 'kottravai', ' '), '[^a-z0-9\\s]+', ' ', 'g'));
      NEW.normalized_description := trim(regexp_replace(replace(lower(coalesce(NEW.description,'')), 'kottravai', ' '), '[^a-z0-9\\s]+', ' ', 'g'));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`;

    await db.query(fn, []);

    console.log('Attaching trigger to products table (before INSERT OR UPDATE)...');
    await db.query("DROP TRIGGER IF EXISTS trg_products_normalize ON products", []);
    await db.query("CREATE TRIGGER trg_products_normalize BEFORE INSERT OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION products_normalize_trigger()", []);

    console.log('Dropping older expression indexes if they exist to avoid duplicates...');
    await db.query("DROP INDEX IF EXISTS idx_products_normalized_name_trgm", []);
    await db.query("DROP INDEX IF EXISTS idx_products_normalized_category_trgm", []);
    await db.query("DROP INDEX IF EXISTS idx_products_normalized_description_trgm", []);

    console.log('Ensuring pg_trgm extension exists...');
    await db.query('CREATE EXTENSION IF NOT EXISTS pg_trgm', []);

    console.log('Creating GIN trigram indexes on persisted normalized columns...');
    await db.query("CREATE INDEX IF NOT EXISTS idx_products_normalized_name_trgm_col ON products USING gin (normalized_name gin_trgm_ops)", []);
    await db.query("CREATE INDEX IF NOT EXISTS idx_products_normalized_category_trgm_col ON products USING gin (normalized_category gin_trgm_ops)", []);
    await db.query("CREATE INDEX IF NOT EXISTS idx_products_normalized_description_trgm_col ON products USING gin (normalized_description gin_trgm_ops)", []);

    console.log('Creating/ensuring B-tree indexes...');
    await db.query("CREATE INDEX IF NOT EXISTS idx_products_is_live ON products(is_live)", []);
    await db.query("CREATE INDEX IF NOT EXISTS idx_products_category_slug ON products(category_slug)", []);
    await db.query("CREATE INDEX IF NOT EXISTS idx_products_created_at_desc ON products(created_at DESC)", []);

    console.log('ANALYZE products');
    await db.query('ANALYZE products', []);

    console.log('Migration complete');
    process.exit(0);
  }catch(e){
    console.error('Migration failed:', e.message);
    process.exit(1);
  }
})();
