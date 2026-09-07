const fs = require('fs');
let c = fs.readFileSync('server/services/googleSheetsService.js', 'utf8');

const target = `exports.fetchRawEventRows = fetchRawEventRows;
exports.fetchRawEventRowsForDate = fetchRawEventRowsForDate;`;

const index = c.lastIndexOf(target);
if (index !== -1) {
    c = c.slice(0, index + target.length) + '\n';
}

fs.writeFileSync('server/services/googleSheetsService.js', c);
