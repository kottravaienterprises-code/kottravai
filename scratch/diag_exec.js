require('dotenv').config({path: 'server/.env'});
const { google } = require('googleapis');

async function run() {
    const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
    );
    const sheets = google.sheets({ version: 'v4', auth });
    
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Executive Dashboard!A:Z'
    });
    
    const rows = res.data.values || [];
    for(let i=0; i<rows.length; i++) {
        if(rows[i].some(cell => String(cell).toLowerCase().includes('report') || String(cell).toLowerCase().includes('setting'))) {
            console.log("Row", i, ":", rows[i]);
        }
    }

    const res2 = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Raw Events!A1:Z10'
    });
    console.log("RAW EVENTS headers:", res2.data.values ? res2.data.values[0] : null);

}
run();
