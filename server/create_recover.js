const fs = require('fs');

let code = fs.readFileSync('index.js', 'utf8');

code += `
setTimeout(async () => {
    if (process.env.RUN_RECOVERY) {
        console.log('Running recovery...');
        const ids = ['order_TUJ6d5r1CyQjOy', 'order_TUIjTqsNoiurn7'];
        for (const id of ids) {
            try {
                const p = await db.query('SELECT order_data FROM pending_orders WHERE razorpay_order_id = $1', [id]);
                if (p.rows[0]) {
                    const o = typeof p.rows[0].order_data === 'string' ? JSON.parse(p.rows[0].order_data) : p.rows[0].order_data;
                    const pid = 'pay_recovered_' + Date.now() + '_' + Math.floor(Math.random()*1000);
                    o.orderId = id; 
                    console.log('Finalizing', id);
                    try {
                        const res = await finalizeOrder(o, pid);
                        console.log('Recovered', id, res);
                    } catch(err) {
                        if (err.message.includes('foreign key constraint')) {
                            console.log('Retrying without customerId due to foreign key error...');
                            o.customerId = null;
                            const res2 = await finalizeOrder(o, pid + '2');
                            console.log('Recovered on retry', id, res2);
                        } else {
                            throw err;
                        }
                    }
                } else {
                    console.log('Pending order not found for', id);
                }
            } catch (err) {
                console.error('Error recovering', id, err);
            }
        }
        console.log('Recovery complete!');
        process.exit(0);
    }
}, 5000);
`;

fs.writeFileSync('recover.js', code);
console.log('recover.js created successfully.');
