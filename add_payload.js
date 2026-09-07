const fs = require('fs');
let c = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

c = c.replace(
    'variants: formData.variants,',
    'variants: formData.variants,\n        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,\n        campaignTag: formData.campaignTag || null,'
);

fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', c);
