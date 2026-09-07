const fs = require('fs');
let c = fs.readFileSync('server/services/googleSheetsService.js', 'utf8');
c = c.replace("console.log('[DIAG] ✅ All diagnostic tests passed');", `} else {
    try {
        await db.query('SELECT 1');
        const step = results.steps.find(st => st.name === 'postgres_analytics_health');
        if (step) { step.status = 'PASSED'; step.details = 'PostgreSQL DB is accessible'; }
    } catch (err) {
        const step = results.steps.find(st => st.name === 'postgres_analytics_health');
        if (step) { step.status = 'FAILED'; step.error = err.message; }
    }
  }
  console.log('[DIAG] ✅ All diagnostic tests passed');`);
fs.writeFileSync('server/services/googleSheetsService.js', c);
