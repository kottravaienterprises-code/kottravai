const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function update() {
    try {
        await pool.query("UPDATE orders SET shiprocket_order_id = $1, shipment_id = $2 WHERE order_id = $3", ['1546216537', '1542436176', 'order_TV8A0C2fudq1zL']);
        console.log('Updated DB with Shiprocket IDs for Praveenraj order');
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
update();
