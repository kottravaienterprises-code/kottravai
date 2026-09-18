require('dotenv').config({path: 'server/.env'});
const { google } = require('googleapis');

async function checkTest() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = String(process.env.GOOGLE_SHEET_ID).trim();

  try {
    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'MASTER_EVENT_LOG_V2'
    });
    
    const rows = dataRes.data.values || [];
    if (rows.length > 1) {
        const headers = rows[0].map(h => String(h).trim().toLowerCase());
        const orderIdIdx = headers.indexOf('order_id');
        const eventTypeIdx = headers.indexOf('event_type');
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const e = eventTypeIdx !== -1 ? row[eventTypeIdx] : null;
            const oId = orderIdIdx !== -1 ? row[orderIdIdx] : null;
            
            if (e && String(e).toLowerCase() === 'purchase_completed') {
                console.log(`Row ${i + 1}: Event = ${e}, Order ID = ${oId}`);
            }
        }
    }
  } catch (err) {
    console.error(err);
  }
}

checkTest();
