const axios = require('axios');

async function run() {
    try {
        console.log("Checking API endpoint...");
        // 1. Create a product with SKU
        let createRes;
        try {
            createRes = await axios.post('http://localhost:5000/api/products', {
                name: 'Test SKU Product',
                price: 100,
                category: 'test-category',
                sku: 'KT-TEST-001'
            }, {
                headers: {
                    'x-admin-secret': process.env.VITE_ADMIN_PASSWORD || 'Admin!Kottravai2025%100'
                }
            });
            console.log("Create Product:", createRes.data);
        } catch(e) {
            console.error("Create Product Error:", e.response?.data || e.message);
        }

        // 2. Search for the SKU
        try {
            const skuRes = await axios.get('http://localhost:5000/api/products/sku/kt-test-001');
            console.log("SKU Search Result:", skuRes.data);
        } catch(e) {
            console.error("SKU Search Error:", e.response?.data || e.message);
        }

        // 3. Duplicate check
        try {
            await axios.post('http://localhost:5000/api/products', {
                name: 'Test SKU Product 2',
                price: 100,
                category: 'test-category',
                sku: 'KT-TEST-001'
            }, {
                headers: {
                    'x-admin-secret': process.env.VITE_ADMIN_PASSWORD || 'Admin!Kottravai2025%100'
                }
            });
        } catch(e) {
            console.error("Duplicate Check Error (Expected 400):", e.response?.data || e.message);
        }
        
    } catch(e) {
        console.error(e.message);
    }
}

run();
