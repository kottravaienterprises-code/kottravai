const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

// 1. Add UNIQUE to the create table if it's there
code = code.replace(
    'sku VARCHAR(255),', 
    'sku VARCHAR(255) UNIQUE,'
);

// 2. Add an ALTER TABLE command right after table creations (around line 1472, where 'CREATE INDEX' usually are)
const alterCmd = `
        await db.query(\`
            ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(255);
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'products_sku_key'
                ) THEN
                    ALTER TABLE products ADD CONSTRAINT products_sku_key UNIQUE (sku);
                END IF;
            END $$;
        \`);
        console.log('✅ SKU column and unique constraint verified');
`;

if (!code.includes('products_sku_key')) {
    const insertPoint = code.indexOf('await db.query(`\n            CREATE INDEX IF NOT EXISTS idx_products_category');
    if (insertPoint !== -1) {
        code = code.substring(0, insertPoint) + alterCmd + code.substring(insertPoint);
    } else {
        console.error('Could not find insert point for ALTER TABLE!');
    }
}

fs.writeFileSync('server/index.js', code);
console.log('Database schema patched in server/index.js');
