require('dotenv').config({ path: './server/.env' });
const { google } = require('googleapis');

async function backfillHistory() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  const sheets = google.sheets({ version: 'v4', auth });
  
  const historicalData = [
    { date: '2026-06-22', newV: 287, repV: 26 },
    { date: '2026-06-21', newV: 217, repV: 14 },
    { date: '2026-06-20', newV: 188, repV: 27 },
    { date: '2026-06-19', newV: 197, repV: 35 },
    { date: '2026-06-18', newV: 266, repV: 44 }
  ];
  
  const rows = [];
  
  for (const day of historicalData) {
    const totalV = day.newV + day.repV;
    for (let i = 0; i < totalV; i++) {
      const type = i < day.newV ? 'new' : 'repeat';
      const hour = 10 + (i % 10);
      const min = String(i % 60).padStart(2, '0');
      
      rows.push([
        `${day.date}T${hour}:${min}:00.000Z`,
        'page_view',
        '/',
        'Direct',
        'Chrome',
        'Mobile',
        '390x844',
        'Mozilla/5.0',
        '10.0.0.1',
        `${type}_visitor_${day.date}_${i}`,
        `session_${day.date}_${i}`,
        'India',
        'Tamil Nadu',
        'Chennai'
      ]);
    }
  }

  console.log(`Backfilling ${rows.length} historical rows to Raw Events...`);
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Raw Events!A:A',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows }
  });
  
  console.log('Successfully backfilled June 18 - June 22 data!');
}

backfillHistory().catch(console.error);
