const fs = require('fs');
const lines = fs.readFileSync('server/services/dailyAnalyticsService.js', 'utf8').split('\n');

const newLines = [
  ...lines.slice(0, 37),
  '  const fetchStart = Date.now();',
  '  const rows = await fetchRawEventRowsForDate(s, targetDateStr);',
  '  console.log(`[DAILY_ANALYTICS] Fetched ${rows.length} rows in ${Date.now() - fetchStart}ms`);',
  ...lines.slice(71)
];

fs.writeFileSync('server/services/dailyAnalyticsService.js', newLines.join('\n'));
