const { sheets } = require('./server/services/googleSheetsService');

async function checkLatest() {
    try {
        const s = await sheets();
        const res = await s.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Raw Events!A:AG'
        });
        const rows = res.data.values || [];
        console.log(`Total rows in Raw Events: ${rows.length}`);
        let found = 0;
        for (let i = rows.length - 1; i >= 0; i--) {
            const ts = rows[i][0];
            if (ts && ts.trim() !== '') {
                console.log(`Row ${i+1}: ${ts}`);
                found++;
                if (found >= 5) break;
            }
        }
    } catch (e) {
        console.error(e.message);
    }
}

require('dotenv').config();
checkLatest();
