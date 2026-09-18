require('dotenv').config({path: 'server/.env'});
const { google } = require('googleapis');

async function verify() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  );

  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  const spreadsheetId = String(process.env.GOOGLE_SHEET_ID).trim();

  console.log("=== DRIVE API TEST ===");
  try {
    const driveRes = await drive.files.get({
      fileId: spreadsheetId,
      fields: 'id,name,mimeType,driveId,webViewLink,permissions'
    });
    console.log("Drive API SUCCESS");
    console.log("Name:", driveRes.data.name);
    console.log("MimeType:", driveRes.data.mimeType);
    console.log("Permissions:", JSON.stringify(driveRes.data.permissions || []));
  } catch (err) {
    console.log("Drive API FAILED:");
    console.log("Error:", err.message);
    if (err.response) {
      console.log("HTTP Status:", err.response.status);
    }
  }

  console.log("\n=== SHEETS API TEST ===");
  try {
    console.log("=== LOADED CONFIGURATION ===");
    console.log("Loaded GOOGLE_SHEET_ID:", spreadsheetId);
    console.log("==============================\n");

    const res = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });
    
    console.log("Spreadsheet Title:");
    console.log(res.data.properties.title);
    console.log("");
    console.log("Spreadsheet ID:");
    console.log(spreadsheetId);
    console.log("");
    
    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'MASTER_EVENT_LOG_V2'
    });
    
    const rows = dataRes.data.values || [];
    
    console.log("MASTER_EVENT_LOG_V2 Rows:");
    console.log(rows.length);
    console.log("");
    
    console.log("MASTER_EVENT_LOG_V2 Columns:");
    console.log(rows.length > 0 ? rows[0].length : 0);
    console.log("");
    
    let earliest = null;
    let latest = null;
    const visitors = new Set();
    const sessions = new Set();
    let purchases = 0;
    
    const validOrders = new Set();
    let sumOrderTotal = 0;
    
    if (rows.length > 1) {
        const headers = rows[0].map(h => String(h).trim().toLowerCase());
        const tIdx = headers.indexOf('timestamp');
        const eIdx = headers.indexOf('event_type');
        const vIdx = headers.indexOf('visitor_id');
        const sIdx = headers.indexOf('session_id');
        const orderIdIdx = headers.indexOf('order_id');
        const orderTotalIdx = headers.indexOf('order_total');

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const t = tIdx !== -1 ? row[tIdx] : null;
            const e = eIdx !== -1 ? row[eIdx] : null;
            const v = vIdx !== -1 ? row[vIdx] : null;
            const s = sIdx !== -1 ? row[sIdx] : null;
            const oId = orderIdIdx !== -1 ? row[orderIdIdx] : null;
            const oTotal = orderTotalIdx !== -1 ? row[orderTotalIdx] : null;
            
            if (t) {
                const ts = new Date(t).getTime();
                if (!isNaN(ts)) {
                    if (earliest === null || ts < earliest) earliest = ts;
                    if (latest === null || ts > latest) latest = ts;
                }
            }
            if (v && String(v).trim() !== '') visitors.add(String(v).trim());
            if (s && String(s).trim() !== '') sessions.add(String(s).trim());
            
            if (e && String(e).toLowerCase() === 'purchase_completed') {
                purchases++;
                
                if (oId && String(oId).trim() !== '') {
                    const cleanOrderId = String(oId).trim();
                    if (!validOrders.has(cleanOrderId)) {
                        validOrders.add(cleanOrderId);
                        if (oTotal && !isNaN(parseFloat(oTotal))) {
                            sumOrderTotal += parseFloat(oTotal);
                        }
                    }
                }
            }
        }
    }
    
    console.log("Earliest Timestamp:");
    console.log(earliest ? new Date(earliest).toISOString() : 'N/A');
    console.log("");
    
    console.log("Latest Timestamp:");
    console.log(latest ? new Date(latest).toISOString() : 'N/A');
    console.log("");
    
    console.log("Unique Visitors:");
    console.log(visitors.size);
    console.log("");
    
    console.log("Unique Sessions:");
    console.log(sessions.size);
    console.log("");
    
    console.log("Purchase Completed Events:");
    console.log(purchases);
    console.log("");
    
    console.log("Valid Unique Order ID Count:");
    console.log(validOrders.size);
    console.log("");
    
    console.log("Sum of Valid Order Totals:");
    console.log(sumOrderTotal.toFixed(2));
    console.log("");
    
    console.log("=======================================");
    
  } catch (err) {
    console.log("Sheets API FAILED:");
    console.error("Error:", err.message);
    if (err.response) {
      console.log("HTTP Status:", err.response.status);
    }
  }
}

verify();
