const pool = require('./db');
const { sheets } = require('./services/googleSheetsService');

async function migrate() {
    console.log('Starting Google Sheets -> PostgreSQL Migration...');
    let s;
    try {
        s = await sheets();
    } catch (e) {
        console.error('Failed to init Google Sheets API:', e.message);
        process.exit(1);
    }
    
    console.log('Fetching Raw Events from Google Sheets...');
    const res = await s.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Raw Events!A2:AG'
    });
    
    const rows = res.data.values || [];
    console.log(`Fetched ${rows.length} rows.`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Batch process to not overwhelm DB
    const BATCH_SIZE = 1000;
    
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${i} to ${i + batch.length} / ${rows.length}`);
        
        for (const row of batch) {
            try {
                // Map columns
                // 0: Timestamp, 1: Event Type, 2: Page, 3: Referrer, 4: Browser, 5: Device, 6: Screen Size, 7: User Agent
                // 8: Session ID, 9: Visitor ID, 10: UTM Source, 11: UTM Medium, 12: UTM Campaign, 13: Product ID, 14: Product Name
                // 15: Category, 16: Price, 17: Quantity, 18: Order ID, 19: Order Total, 20: Payment Method, 21: Duration Seconds
                // 22: Metadata, 23: IP Address, 24: Country, 25: State, 26: City, 27: Region, 28: ISP, 29: Latitude, 30: Longitude
                // 31: UTM Content, 32: UTM Term
                
                const timestamp = row[0] || new Date().toISOString();
                const event_type = row[1] || 'unknown';
                if (!row[0] && !row[1] && !row[8]) continue; // Skip empty rows
                
                const query = `
                    INSERT INTO analytics_events (
                        event_timestamp, event_name, page_url, referrer, browser, device, screen_size, user_agent,
                        session_id, visitor_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
                        product_id, product_name, category, price, quantity, order_id, order_total, payment_method,
                        duration_seconds, metadata, ip_address, geo_country, geo_state, geo_city, geo_region, geo_isp,
                        geo_latitude, geo_longitude
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
                    )
                `;
                
                const getVal = (idx) => (row[idx] && row[idx] !== '' ? row[idx] : null);
                
                let metadataJson = null;
                if (row[22]) {
                    try { metadataJson = JSON.stringify(JSON.parse(row[22])); } catch(e) {}
                }
                
                const values = [
                    timestamp, event_type, getVal(2), getVal(3), getVal(4), getVal(5), getVal(6), getVal(7),
                    getVal(8), getVal(9), getVal(10), getVal(11), getVal(12), getVal(32), getVal(31),
                    getVal(13), getVal(14), getVal(15), getVal(16), getVal(17), getVal(18), getVal(19), getVal(20),
                    getVal(21), metadataJson, getVal(23), getVal(24), getVal(25), getVal(26), getVal(27), getVal(28),
                    getVal(29), getVal(30)
                ];
                
                await pool.query(query, values);
                successCount++;
            } catch (err) {
                failCount++;
            }
        }
    }
    
    console.log('Migration Complete.');
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    process.exit(0);
}

require('dotenv').config();
migrate();
