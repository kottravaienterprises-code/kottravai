const fs = require('fs');
const lines = fs.readFileSync('server/index.js', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes("app.put('/api/products/:id'"));
console.log(lines.slice(start, start + 100).join('\n'));
