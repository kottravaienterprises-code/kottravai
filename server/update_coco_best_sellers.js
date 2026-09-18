const db = require('./db');
async function run() {
    try {
        await db.query('UPDATE products SET is_best_seller = false WHERE name ILIKE \'%coco%\' OR name ILIKE \'%coconut%\'');
        
        const updates = {
            'Kottravai Handmade Coconut Shell Nativity Set – Eco-Friendly Christmas Nativity Scene Decor': 10,
            'Kottravai Handmade Coconut Shell Tea Cup – Eco-Friendly Natural Coconut Cup for Tea & Coffee': 3,
            'Kottravai Handmade Coconut Shell Candle Holder – Eco-Friendly Natural Diya for Pooja & Home Decor': 2,
            'Handcrafted Coconut Shell Coffee Mug Set – Eco-Friendly Natural Tea & Coffee Cups': 1,
            'The Quote Stand – Coconut Shell': 1,
            'Handcrafted Coconut Shell Cross Pendant Necklace | Eco-Friendly Spiritual Jewelry': 1,
            'Kottravai Handmade Coconut Shell Pen Holder – Eco-Friendly Desk Organizer for Office & Study Table': 1,
            'Kottravai Handmade Coconut Shell Bowl – Eco-Friendly Natural Serving Bowl for Fruits, Snacks & Salads': 1
        };
        
        for (const [name, qty] of Object.entries(updates)) {
            await db.query('UPDATE products SET is_best_seller = true WHERE name = $1', [name]);
            console.log(`Updated ${name} to best seller`);
        }
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
