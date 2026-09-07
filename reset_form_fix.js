const fs = require('fs');
let lines = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const resetForm = () => {')) {
        lines.splice(i+3, 0, '      originalPrice: "",', '      campaignTag: "",');
        break;
    }
}
fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', lines.join('\n'));
