require('dotenv').config();
const db = require('./db');

async function applyCampaign() {
    try {
        console.log('Starting 70% OFF Campaign Migration (COCONUT SHELL ONLY)...');

        // 1. Fetch all eligible products (ONLY COCONUT SHELL)
        const { rows: products } = await db.query(`
            SELECT id, name, price, original_price, slug, category, campaign_tag, campaign_excluded 
            FROM products 
            WHERE 
                slug != 'rural-livelihood-hackathon-2026' 
                AND LOWER(category) != 'events' 
                AND LOWER(category) != 'digital'
                AND campaign_excluded != true
                AND (
                    name ILIKE '%coconut%' OR 
                    category ILIKE '%coconut%'
                )
        `);

        console.log(`Found ${products.length} potentially eligible Coconut Shell products.`);

        let updatedCount = 0;
        let skippedCount = 0;

        const now = new Date();
        const end = new Date();
        end.setDate(now.getDate() + 7); // 7 days duration

        for (const p of products) {
            if (p.campaign_tag === '70% OFF') {
                skippedCount++;
                continue; // Already participating
            }

            // DO NOT calculate original_price from an already discounted price.
            // If it already has a valid original_price from the current campaign, use that.
            // Otherwise use the current price.
            // Since we just rolled back everything, original_price should be null, and current price is the full price.
            // But we add this logic just in case to fulfill the requirement:
            const fullPrice = p.original_price ? Number(p.original_price) : Number(p.price);
            
            // Calculate 30% of full price (70% OFF)
            const salePrice = (fullPrice * 0.30).toFixed(2);

            // Update DB
            await db.query(`
                UPDATE products 
                SET 
                    original_price = $1,
                    price = $2,
                    campaign_tag = '70% OFF',
                    sale_start_at = $3,
                    sale_end_at = $4
                WHERE id = $5
            `, [fullPrice, salePrice, now, end, p.id]);

            updatedCount++;
            console.log(`Updated: ${p.name} | Original: ₹${fullPrice} -> Sale: ₹${salePrice}`);
        }

        console.log(`\n--- Campaign Summary ---`);
        console.log(`Products updated: ${updatedCount}`);
        console.log(`Products skipped (already in campaign): ${skippedCount}`);
        console.log(`Campaign start: ${now.toISOString()}`);
        console.log(`Campaign end: ${end.toISOString()}`);

    } catch (error) {
        console.error('❌ Error applying campaign:', error);
    } finally {
        process.exit(0);
    }
}

applyCampaign();
