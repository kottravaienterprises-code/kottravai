const db = require('./server/db');

async function removeHamperCampaign() {
    try {
        console.log("Removing 70% OFF campaign from Hampers...");

        const query = `
            UPDATE products
            SET 
                price = original_price,
                original_price = NULL,
                campaign_tag = NULL,
                sale_start_at = NULL,
                sale_end_at = NULL
            WHERE 
                (category ILIKE '%hamper%' OR category_slug ILIKE '%hamper%')
                AND campaign_tag = '70% OFF'
                AND original_price IS NOT NULL
            RETURNING id, name, price, original_price;
        `;
        
        const res = await db.query(query);
        console.log(`Successfully updated ${res.rowCount} products in Hampers category.`);
        console.log("Updated products:");
        console.log(res.rows);
        
        process.exit(0);
    } catch (err) {
        console.error("Error removing campaign:", err);
        process.exit(1);
    }
}

removeHamperCampaign();
