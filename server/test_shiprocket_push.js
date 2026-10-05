const shiprocketService = require('./services/shiprocketService');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testPush() {
    try {
        const orderId = 'order_TV8A0C2fudq1zL';
        const orderRes = await pool.query('SELECT * FROM orders WHERE order_id = $1', [orderId]);
        const order = orderRes.rows[0];

        let sanitizedPhone = order.customer_phone || "9999999999";
        sanitizedPhone = sanitizedPhone.toString().replace(/\D/g, "").slice(-10);

        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

        console.log("Pushing to Shiprocket...");
        const shipmentResult = await shiprocketService.createOrder({
            orderId: order.order_id,
            orderDate: new Date(order.created_at).toISOString().split('T')[0],
            customer: {
                firstName: order.customer_name.split(' ')[0],
                lastName: order.customer_name.split(' ').slice(1).join(' ') || 'Customer',
                email: order.customer_email,
                phone: sanitizedPhone,
                address: order.address,
                city: order.city,
                state: order.state || 'Tamil Nadu',
                pincode: order.pincode,
                country: 'India',
            },
            items: items.map((item) => ({
                id: item.id,
                name: item.name,
                sku: item.sku || `SKU-${item.id}`,
                quantity: item.quantity,
                price: item.price,
            })),
            payment: { method: 'prepaid' },
            dimensions: { length: 10, breadth: 10, height: 10, weight: 0.5 }
        });

        console.log("SUCCESS:", shipmentResult);
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        pool.end();
    }
}
testPush();
