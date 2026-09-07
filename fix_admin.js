const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

content = content.replace(/sku: "",\s*name: "",\s*sku: "",\s*sku: "",/g, 'sku: "",\n    name: "",');
content = content.replace(/sku: product.sku,/g, '');
content = content.replace(/sku: "",\n\s*name: quickEditForm.name,/g, 'name: quickEditForm.name,');

fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', content);
