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
        if (rows.length > 1) {
            console.log('Last 5 timestamps:');
            for (let i = Math.max(1, rows.length - 5); i < rows.length; i++) {
                console.log(rows[i][0]); // Column A is Timestamp
            }
        }
    } catch (e) {
        console.error(e.message);
    }
}

require('dotenv').config();
checkLatest();
