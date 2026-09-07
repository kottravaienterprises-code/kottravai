const { sheets, fetchRawEventRowsForDate } = require('./server/services/googleSheetsService');

async function test() {
    const s = await sheets();
    
    for (let i = 0; i <= 3; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const targetDateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        try {
            const rows = await fetchRawEventRowsForDate(s, targetDateStr);
            console.log(`Date: ${targetDateStr}, Rows: ${rows.length}`);
        } catch(e) {
            console.error(`Date: ${targetDateStr}, Error:`, e.message);
        }
    }
}
test();
