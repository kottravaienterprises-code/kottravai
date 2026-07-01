require('dotenv').config({ path: './server/.env' });
const svc = require('./server/services/googleSheetsService.js');
console.log('[TRIGGER] Calling populateDashboardSheet...');
svc.populateDashboardSheet()
  .then(() => { console.log('[SUCCESS] Dashboard rebuilt successfully!'); process.exit(0); })
  .catch(e => { console.error('[FAILED]', e.message); process.exit(1); });
