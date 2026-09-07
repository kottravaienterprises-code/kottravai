const fs = require('fs');
let c = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

c = c.replace(
    'const resetForm = () => {\n    setFormData({\n      name: "",\n      price: "",',
    'const resetForm = () => {\n    setFormData({\n      name: "",\n      price: "",\n      originalPrice: "",\n      campaignTag: "",'
);

c = c.replace(
    'originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,\n        campaignTag: formData.campaignTag || null,',
    'originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,\n        campaignTag: formData.campaignTag || undefined,'
);

fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', c);
