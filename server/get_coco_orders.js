const db = require('./db');

async function run() {
    try {
        const res = await db.query('SELECT items FROM orders');
        const cocoOrders = {};
        let totalQuantity = 0;

        res.rows.forEach(row => {
            if (!row.items || !Array.isArray(row.items)) return;
            
            row.items.forEach(item => {
                if (!item.name) return;
                
                const name = item.name.toLowerCase();
                const category = (item.category || '').toLowerCase();
                
                if (name.includes('coco') || category.includes('coco') || name.includes('coconut') || category.includes('coconut')) {
                    const qty = item.quantity || 1;
                    cocoOrders[item.name] = (cocoOrders[item.name] || 0) + qty;
                    totalQuantity += qty;
                }
            });
        });

        console.log('--- Coconut Shell Products Ordered ---');
        if (Object.keys(cocoOrders).length === 0) {
            console.log('No coconut shell products have been ordered yet.');
        } else {
            Object.entries(cocoOrders)
                .sort((a, b) => b[1] - a[1]) // Sort by quantity descending
                .forEach(([name, qty]) => {
                    console.log(`- ${name}: ${qty} ordered`);
                });
            console.log('--------------------------------------');
            console.log(`Total Coconut Shell Products Ordered: ${totalQuantity}`);
        }
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}

run();
