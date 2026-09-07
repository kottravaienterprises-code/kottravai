const fs = require('fs');

function patchFile(path, regex, replacer) {
    let code = fs.readFileSync(path, 'utf8');
    code = code.replace(regex, replacer);
    fs.writeFileSync(path, code);
    console.log('Patched', path);
}

patchFile('src/components/home/BestSellers.tsx', 
    /analytics\.trackEvent\('product_view', \{\s*product_id: ([^,]+),\s*product_name: ([^,]+),\s*price: ([^,]+),\s*category: ([^\}]+)\s*\}\)/g, 
    (match, id, name, price, category) => {
        const obj = id.split('.')[0]; // Usually 'product'
        return `analytics.trackEvent('product_view', {
                            product_id: ${id},
                            product_name: ${name},
                            price: ${price},
                            category: ${category},
                            sku: ${obj}.sku,
                            stock_status: ${obj}.isLive || ${obj}.is_live ? 'in_stock' : 'out_of_stock'
                        })`;
    }
);

patchFile('src/components/home/ProductCard.tsx', 
    /analytics\.trackEvent\('product_view', \{\s*product_id: ([^,]+),\s*product_name: ([^,]+),\s*price: ([^,]+),\s*category: ([^\}]+)\s*\}\)/g, 
    (match, id, name, price, category) => {
        const obj = id.split('.')[0]; // Usually 'product'
        return `analytics.trackEvent('product_view', {
                        product_id: ${id},
                        product_name: ${name},
                        price: ${price},
                        category: ${category},
                        sku: ${obj}.sku,
                        stock_status: ${obj}.isLive || ${obj}.is_live ? 'in_stock' : 'out_of_stock'
                    })`;
    }
);

patchFile('src/pages/ProductDetails.tsx', 
    /analytics\.trackEvent\('product_view', \{\s*product_id: ([^,]+),\s*product_name: ([^,]+),\s*price: ([^,]+),\s*category: ([^\}]+)\s*\}\)/g, 
    (match, id, name, price, category) => {
        const obj = id.split('.')[0]; // Usually 'product'
        return `analytics.trackEvent('product_view', {
            product_id: ${id},
            product_name: ${name},
            price: ${price},
            category: ${category},
            sku: ${obj}.sku,
            stock_status: ${obj}.isLive || ${obj}.is_live ? 'in_stock' : 'out_of_stock'
        })`;
    }
);
