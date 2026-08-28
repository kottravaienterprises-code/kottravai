require('dotenv').config();
const db = require('./db');

async function expireCampaign() {
    try {
        console.log('Starting 70% OFF Campaign Restoration...');

        const { rows: products } = await db.query(`
            SELECT id, name, price, original_price 
            FROM products 
            WHERE campaign_tag = '70% OFF' AND original_price IS NOT NULL
        `);

        console.log(`Found ${products.length} products to restore.`);

        let restoredCount = 0;

        for (const p of products) {
            await db.query(`
                UPDATE products 
                SET 
                    price = original_price,
                    original_price = NULL,
                    campaign_tag = NULL,
                    sale_start_at = NULL,
                    sale_end_at = NULL
                WHERE id = $1
            `, [p.id]);

            restoredCount++;
            console.log(`Restored: ${p.name} | Reverted to: ₹${p.original_price}`);
        }

        console.log(`\n✅ Successfully restored ${restoredCount} products to their original prices.`);
    } catch (error) {
        console.error('❌ Error restoring campaign:', error);
    } finally {
        process.exit(0);
    }
}

expireCampaign();
