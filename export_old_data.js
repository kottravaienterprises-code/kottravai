require('dotenv').config({ path: './server/.env' });
const fs = require('fs');
const { google } = require('googleapis');

async function exportData() {
    try {
        console.log("Connecting to Google Sheets...");
        const auth = new google.auth.JWT(
            process.env.GOOGLE_CLIENT_EMAIL,
            null,
            process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            ['https://www.googleapis.com/auth/spreadsheets']
        );
        const sheets = google.sheets({ version: 'v4', auth });
        
        console.log("Downloading data from 'Raw Events'...");
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Raw Events!A:AG'
        });
        
        const rows = res.data.values;
        if (!rows || rows.length === 0) {
            return console.log("No data found.");
        }

        console.log(`Processing ${rows.length} rows...`);

        const escapeCsv = (str) => {
            if (str === null || str === undefined) return '';
            const s = String(str);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
        };

        const csvData = rows.map(r => {
            // pad row to 33 columns if shorter
            const fullRow = [...r];
            while (fullRow.length < 33) fullRow.push('');
            return fullRow.map(escapeCsv).join(',');
        }).join('\n');

        const filename = 'kottravai_historical_events_export.csv';
        fs.writeFileSync(filename, csvData);
        console.log(`Successfully exported to ${filename}!`);
    } catch (e) {
        console.error("Export failed:", e);
    }
}

exportData();
