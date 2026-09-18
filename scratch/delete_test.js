require('dotenv').config({path: 'server/.env'});
const { google } = require('googleapis');

async function deleteTest() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = String(process.env.GOOGLE_SHEET_ID).trim();

  try {
    // 1. Get the sheet ID for MASTER_EVENT_LOG_V2
    const metaRes = await sheets.spreadsheets.get({
        spreadsheetId
    });
    
    const sheet = metaRes.data.sheets.find(s => s.properties.title === 'MASTER_EVENT_LOG_V2');
    if (!sheet) {
        console.log("MASTER_EVENT_LOG_V2 not found.");
        return;
    }
    const sheetId = sheet.properties.sheetId;

    // 2. Fetch the data to find the row index
    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'MASTER_EVENT_LOG_V2'
    });
    
    const rows = dataRes.data.values || [];
    if (rows.length <= 1) return;
    
    const headers = rows[0].map(h => String(h).trim().toLowerCase());
    const orderIdIdx = headers.indexOf('order_id');
    
    let rowIndexToDelete = -1;
    
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const oId = orderIdIdx !== -1 ? row[orderIdIdx] : null;
        if (oId && String(oId).trim() === 'test_123') {
            rowIndexToDelete = i;
            break;
        }
    }
    
    if (rowIndexToDelete !== -1) {
        console.log(`Found test_123 at row index ${rowIndexToDelete} (Row ${rowIndexToDelete + 1} in Sheets). Deleting...`);
        
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndexToDelete,
                                endIndex: rowIndexToDelete + 1
                            }
                        }
                    }
                ]
            }
        });
        console.log("Successfully deleted test_123 row.");
    } else {
        console.log("test_123 not found.");
    }

  } catch (err) {
    console.error(err);
  }
}

deleteTest();
