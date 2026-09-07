const fs = require('fs');
let c = fs.readFileSync('server/controllers/trackingController.js', 'utf8');

c = c.replace(
  'await insertEventToPostgres(payload);',
  `if ((process.env.ANALYTICS_MODE || 'legacy') === 'postgres') {
        await insertEventToPostgres(payload);
      } else {
        await googleSheetsService.appendEventRow(payload);
      }`
);

c = c.replace(
  'await insertEventToPostgres(row);',
  `if ((process.env.ANALYTICS_MODE || 'legacy') === 'postgres') {
        await insertEventToPostgres(row);
      } else {
        // Fallback for batch? The loop just iterates row by row now.
        // We can just call googleSheetsService.appendEventRow(row) or collect them and call appendEventRows.
        await googleSheetsService.appendEventRow(row);
      }`
);

fs.writeFileSync('server/controllers/trackingController.js', c);
