require('dotenv').config({path: 'server/.env'});
const { google } = require('googleapis');

async function getTodaysVisitors() {
    const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    let rows = [];
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'MASTER_EVENT_LOG_V2!A:AZ', 
        });
        rows = response.data.values || [];
    } catch (e) {
        console.error("Failed to fetch master event log.", e.message);
        process.exit(1);
    }

    if (rows.length < 2) return;

    const headers = rows[0].map(h => String(h).trim().toLowerCase());
    const tIdx = headers.indexOf('timestamp');
    const vIdx = headers.indexOf('visitor_id');
    const sIdx = headers.indexOf('session_id');
    const emailIdx = headers.indexOf('user_email');
    const roleIdx = headers.indexOf('user_role');

    // Use current date
    const today = new Date();
    // Assuming timezone Asia/Kolkata
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    const targetDate = formatter.format(today); 
    // This will be '2026-09-08' since today is 2026-09-08 in India

    const visitors = new Map();

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const t = tIdx !== -1 ? row[tIdx] : null;
        const v = vIdx !== -1 ? row[vIdx] : null;
        
        if (!t) continue;
        
        const dt = new Date(t);
        if (isNaN(dt.getTime())) continue;
        
        const formattedDate = formatter.format(dt); 

        if (formattedDate === targetDate) {
            const visitorId = v ? String(v).trim() : '';
            if (visitorId !== '') {
                const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx] : 'Anonymous';
                const role = roleIdx !== -1 && row[roleIdx] ? row[roleIdx] : 'N/A';
                if (!visitors.has(visitorId)) {
                    visitors.set(visitorId, { visitorId, email, role, events: 1 });
                } else {
                    visitors.get(visitorId).events++;
                }
            }
        }
    }

    console.log(`=== Visitors for ${targetDate} ===`);
    console.log(`Total Unique Visitors: ${visitors.size}`);
    console.log("Visitor ID | Email | Role | Total Events Today");
    for (const [vId, data] of visitors.entries()) {
        console.log(`${vId} | ${data.email} | ${data.role} | ${data.events}`);
    }
}

getTodaysVisitors();
