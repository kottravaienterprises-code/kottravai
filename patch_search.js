const fs = require('fs');
let c = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

const searchPattern1 = /if \(orderSearchQuery\) \{\s*const q = orderSearchQuery\.toLowerCase\(\);\s*filteredOrders = filteredOrders\.filter\(o =>\s*o\.id\.toLowerCase\(\)\.includes\(q\) \|\|\s*o\.customerName\.toLowerCase\(\)\.includes\(q\) \|\|\s*\(o\.customerPhone && o\.customerPhone\.includes\(q\)\) \|\|\s*o\.items\.some\(\(i:any\) => i\.name\.toLowerCase\(\)\.includes\(q\)\)\s*\);\s*\}/g;

const replacement = `if (orderSearchQuery) {
                    const q = orderSearchQuery.toLowerCase();
                    filteredOrders = filteredOrders.filter(o => 
                        (o.id && o.id.toLowerCase().includes(q)) || 
                        (o.orderId && o.orderId.toLowerCase().includes(q)) || 
                        (o.customerName && o.customerName.toLowerCase().includes(q)) || 
                        (o.customerEmail && o.customerEmail.toLowerCase().includes(q)) || 
                        (o.customerPhone && o.customerPhone.includes(q)) ||
                        (o.items && o.items.some((i:any) => i.name && i.name.toLowerCase().includes(q)))
                    );
                }`;

if (searchPattern1.test(c)) {
    c = c.replace(searchPattern1, replacement);
    fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', c);
    console.log('Done');
} else {
    console.log('Not found');
}
