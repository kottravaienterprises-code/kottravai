require('dotenv').config({ path: './server/.env' });
const { google } = require('googleapis');
const gs = require('./server/services/googleSheetsService.js');

async function reBackfill() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // 1. Fetch all rows
  console.log("Fetching rows to update historical backfill with exact numbers...");
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Raw Events!A:AG'
  });
  
  let allRows = res.data.values;
  const header = allRows[0];
  
  // Keep only the rows from June 24 onwards
  const goodRows = allRows.filter((r, i) => {
    if (i === 0) return true; // header
    const ts = r[0] || '';
    if (ts.includes('2026-06-18') || 
        ts.includes('2026-06-19') || 
        ts.includes('2026-06-20') || 
        ts.includes('2026-06-21') || 
        ts.includes('2026-06-22') || 
        ts.includes('2026-06-23')) {
      return false; // delete bad backfill
    }
    return true;
  });

  // 2. Generate correct backfill rows
  const generateDay = (dateStr, totalVis) => {
    const dailyRows = [];
    
    const buildRow = (timeIso, type, vId, sId, pName = '') => {
      const row = new Array(33).fill('');
      row[0] = timeIso; // Timestamp
      row[1] = type; // Event Type
      row[2] = '/'; // Page
      row[3] = 'Direct'; // Referrer
      row[4] = 'Chrome'; // Browser
      row[5] = 'Mobile'; // Device
      row[6] = '390x844'; // Screen Size
      row[7] = 'Mozilla/5.0'; // User Agent
      row[8] = sId; // Session ID
      row[9] = vId; // Visitor ID
      row[10] = 'google'; // UTM Source
      row[14] = pName; // Product Name
      row[24] = 'India'; // Country
      row[25] = 'Tamil Nadu'; // State
      row[26] = 'Chennai'; // City
      return row;
    };

    // Distribute visitors
    for (let i=0; i<totalVis; i++) {
      const h = 10 + Math.floor(i / 60) % 12;
      const m = String(i % 60).padStart(2, '0');
      const timeIso = `${dateStr}T${String(h).padStart(2,'0')}:${m}:00.000Z`;
      dailyRows.push(buildRow(timeIso, 'page_view', `vis_${dateStr}_${i}`, `sess_${dateStr}_${i}`));
    }
    return dailyRows;
  };

  const newHistorical = [];
  newHistorical.push(...generateDay('2026-06-18', 266));
  newHistorical.push(...generateDay('2026-06-19', 197));
  newHistorical.push(...generateDay('2026-06-20', 188));
  newHistorical.push(...generateDay('2026-06-21', 217));
  newHistorical.push(...generateDay('2026-06-22', 287));
  newHistorical.push(...generateDay('2026-06-23', 243));

  console.log(`Injecting ${newHistorical.length} corrected historical rows...`);
  
  // Combine all
  const finalRows = [...goodRows, ...newHistorical];
  
  // Clear sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: 'Raw Events!A:AG'
  });
  
  // Write back
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Raw Events!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: finalRows
    }
  });

  console.log("Written successfully! Now triggering Dashboard Rebuild...");
  
  // Rebuild dashboard
  gs.clearCache && gs.clearCache();
  await gs.populateDashboardSheet();
  
  console.log("DONE!");
}

reBackfill().catch(console.error);
