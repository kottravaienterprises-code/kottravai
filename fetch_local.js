const axios = require('axios');
async function run() {
    try {
        console.log("Fetching from localhost:5001...");
        const res = await axios.get("http://localhost:5001/api/products?category_slug=coconut-shell-products&sort=best-selling", { timeout: 10000 });
        console.log("Response length:", res.data.length || (res.data.products ? res.data.products.length : 'unknown'));
        const products = Array.isArray(res.data) ? res.data : res.data.products;
        products.slice(0, 10).forEach((p, i) => {
            console.log(`${i+1}. ${p.name} - ${p.salesCount} (ID: ${p.id})`);
        });
    } catch (err) {
        console.error("Fetch failed:", err.message);
    }
}
run();
