const fs = require('fs');
const lines = fs.readFileSync('server/index.js', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes("app.post('/api/products'"));
console.log(lines.slice(start, start + 30).join('\n'));
