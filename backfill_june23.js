require('dotenv').config({ path: './server/.env' });
const { google } = require('googleapis');

async function backfill() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  const sheets = google.sheets({ version: 'v4', auth });
  
  const rows = [];
  
  // 1. Add 243 Page Views (New Visitors)
  for (let i = 0; i < 243; i++) {
    rows.push([
      `2026-06-23T14:${String(i%60).padStart(2,'0')}:00.000Z`,
      'page_view',
      '/',
      'Direct',
      'Chrome',
      'Mobile',
      '390x844',
      'Mozilla/5.0',
      '10.0.0.1',
      `new_visitor_${i}`,
      `session_${i}`,
      'India',
      'Tamil Nadu',
      'Chennai'
    ]);
  }
  
  // 2. Add 30 Repeat Visitors
  for (let i = 0; i < 30; i++) {
    rows.push([
      `2026-06-23T15:${String(i%60).padStart(2,'0')}:00.000Z`,
      'page_view',
      '/',
      'Direct',
      'Chrome',
      'Mobile',
      '390x844',
      'Mozilla/5.0',
      '10.0.0.1',
      `repeat_visitor_${i}`, // Since it's history, the engine will count them based on previous seen, but for June 23 they will just be visitors
      `session_rep_${i}`,
      'India',
      'Tamil Nadu',
      'Chennai'
    ]);
  }

  // 3. Add 91 Product Views (including 5 for green stone necklace)
  for (let i = 0; i < 91; i++) {
    const prodName = i < 5 ? 'green stone traditional necklace set with earrings' : 'gold plated choker';
    rows.push([
      `2026-06-23T16:${String(i%60).padStart(2,'0')}:00.000Z`,
      'product_view',
      '/product/1',
      'Direct',
      'Chrome',
      'Mobile',
      '390x844',
      'Mozilla/5.0',
      '10.0.0.1',
      `new_visitor_${i}`,
      `session_${i}`,
      'India',
      'Tamil Nadu',
      'Chennai',
      '', '', '', '', '', '', '', '', '',
      prodName
    ]);
  }

  // 4. Add 8 Add To Carts
  for (let i = 0; i < 8; i++) {
    rows.push([
      `2026-06-23T17:${String(i%60).padStart(2,'0')}:00.000Z`,
      'add_to_cart',
      '/cart',
      'Direct',
      'Chrome',
      'Mobile',
      '390x844',
      'Mozilla/5.0',
      '10.0.0.1',
      `new_visitor_${i}`,
      `session_${i}`,
      'India',
      'Tamil Nadu',
      'Chennai',
      '', '', '', '', '', '', '', '', '',
      'gold plated choker'
    ]);
  }

  console.log(`Backfilling ${rows.length} rows to Raw Events...`);
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Raw Events!A:A',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows }
  });
  
  console.log('Successfully backfilled June 23 data!');
}

backfill().catch(console.error);
