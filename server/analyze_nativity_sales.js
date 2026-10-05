const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function analyze() {
    try {
        console.log("=== Product Search ===");
        const productRes = await pool.query("SELECT id, name FROM products WHERE name ILIKE '%Nativity Set%'");
        if (productRes.rows.length === 0) {
            console.log("Nativity Set product not found in database.");
            return;
        }
        
        const productId = productRes.rows[0].id;
        const productName = productRes.rows[0].name;
        console.log(`Found Product: ID=${productId}, Name="${productName}"\n`);

        console.log("=== Order Search ===");
        const ordersRes = await pool.query("SELECT id, order_id, shiprocket_order_id, status, items FROM orders");
        
        let totalCount = 0;
        let validSalesCount = 0;
        let cancelledCount = 0;
        let failedCount = 0;
        let otherStatusCount = 0;
        let inShiprocketCount = 0;

        const validStatuses = ['Processing', 'Delivered'];
        const invalidStatuses = ['Cancelled', 'Failed'];

        for (const order of ordersRes.rows) {
            let items = order.items;
            if (typeof items === 'string') {
                try {
                    items = JSON.parse(items);
                } catch (e) {
                    continue; // bad JSON
                }
            }

            if (!Array.isArray(items)) continue;

            const productItem = items.find(i => i.id === productId || i.name === productName);
            
            if (productItem) {
                const quantity = Number(productItem.quantity) || 1;
                totalCount += quantity;
                
                let orderStatus = order.status;
                
                if (validStatuses.includes(orderStatus)) {
                    validSalesCount += quantity;
                } else if (invalidStatuses.includes(orderStatus)) {
                    cancelledCount += quantity;
                } else {
                    otherStatusCount += quantity;
                }

                if (order.shiprocket_order_id) {
                    inShiprocketCount += quantity;
                }
            }
        }

        console.log("=== Sales Analysis ===");
        console.log(`Total Quantity Ordered (All statuses): ${totalCount}`);
        console.log(`Valid Sales (Processing/Delivered): ${validSalesCount}`);
        console.log(`Cancelled/Failed Sales: ${cancelledCount}`);
        console.log(`Other Status Sales: ${otherStatusCount}`);
        console.log(`Quantity in orders with Shiprocket ID: ${inShiprocketCount}`);

        console.log("\n=== API Best Selling Response Verification ===");
        console.log("If validSalesCount doesn't match API, we need to inspect the backend query.");

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

analyze();
