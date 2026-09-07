const fs = require('fs');
let c = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

c = c.replace(
    'const resetForm = () => {\n    setFormData({\n      name: "",\n      price: "",\n      category:',
    'const resetForm = () => {\n    setFormData({\n      name: "",\n      price: "",\n      originalPrice: "",\n      campaignTag: "",\n      category:'
);

fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', c);
