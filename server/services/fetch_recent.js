require('dotenv').config({path: '../.env'});
const googleSheetsService = require('./googleSheetsService');
const { google } = require('googleapis');
const { validateAndRepairKey } = require('../utils/googleKeyValidator');

(async () => {
  try {
    const key = validateAndRepairKey(process.env.GOOGLE_PRIVATE_KEY);
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL.replace(/"/g, '');
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: clientEmail, private_key: key },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log("Fetching raw event rows...");
    const rows = await googleSheetsService.fetchRawEventRows(sheets);
    console.log(`Fetched ${rows.length} rows.`);
    
    // Look for rows where the timestamp starts with '2026-06-24' or '2026-06-25' or '2026-06-23'
    const recentRows = rows.filter(r => 
      r.timestamp && (
        r.timestamp.includes('2026-06-23') ||
        r.timestamp.includes('2026-06-24') ||
        r.timestamp.includes('2026-06-25')
      )
    );
    
    console.log(`Found ${recentRows.length} recent rows for Jun 23-25.`);
    
    const fs = require('fs');
    fs.writeFileSync('recent_rows_filtered.json', JSON.stringify({
      totalLength: rows.length,
      last50RowsAllTime: rows.slice(-50),
      filteredLength: recentRows.length,
      recentRows: recentRows.slice(-100) // max 100
    }, null, 2));
    
    console.log("Saved to recent_rows_filtered.json");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
