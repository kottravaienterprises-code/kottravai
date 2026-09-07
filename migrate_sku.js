const db = require('./server/db');
async function run() {
    try {
        await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(255);`);
        await db.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_sku_key') THEN
                    ALTER TABLE products ADD CONSTRAINT products_sku_key UNIQUE (sku);
                END IF;
            END $$;
        `);
        console.log('Successfully altered DB');
    } catch(e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
}
run();
