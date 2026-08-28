require('dotenv').config();
const db = require('./db');

async function alterPricingSchema() {
    try {
        console.log('Adding pricing campaign columns to products table...');
        
        await db.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS original_price NUMERIC(12,2),
            ADD COLUMN IF NOT EXISTS campaign_tag VARCHAR(100),
            ADD COLUMN IF NOT EXISTS sale_start_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS sale_end_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS campaign_excluded BOOLEAN DEFAULT FALSE;
        `);
        
        console.log('✅ Successfully added campaign columns to products table.');
    } catch (error) {
        console.error('❌ Error altering schema:', error);
    } finally {
        process.exit(0);
    }
}

alterPricingSchema();
