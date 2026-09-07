const { sheets } = require('./server/services/googleSheetsService');

async function checkSheet() {
    try {
        const s = await sheets();
        console.log('Fetching rows from Raw Events...');
        const res = await s.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Raw Events!A1:AG'
        });
        
        const rows = res.data.values || [];
        console.log(`Total rows in Raw Events: ${rows.length}`);
        
        // Find if there are ANY rows containing today's date
        let todayCount = 0;
        let yesterdayCount = 0;
        
        rows.forEach(row => {
            if (row[0] && row[0].includes('2026-08-31')) todayCount++;
            if (row[0] && row[0].includes('2026-08-30')) yesterdayCount++;
        });
        
        console.log(`Rows for 2026-08-31: ${todayCount}`);
        console.log(`Rows for 2026-08-30: ${yesterdayCount}`);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
require('dotenv').config();
checkSheet();
