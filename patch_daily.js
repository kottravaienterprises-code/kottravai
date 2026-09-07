const fs = require('fs');
let c = fs.readFileSync('server/services/dailyAnalyticsService.js', 'utf8');

const regex = /let dbRows = \[\];[\s\S]*?payload\.geo_city \|\| ''\n    \}\);\n  \}\)\);/m;

c = c.replace(/let dbRows = \[\];[\s\S]*?'geo_city': r\.geo_city \|\| ''\n  \}\)\);/, `const rows = await fetchRawEventRowsForDate(s, targetDateStr);`);

fs.writeFileSync('server/services/dailyAnalyticsService.js', c);
