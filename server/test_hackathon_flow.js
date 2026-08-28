require('dotenv').config();
const db = require('./db');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const generateRegistrationId = async () => {
    const res = await db.query(`SELECT count(*) FROM hackathon_registrations`);
    const count = parseInt(res.rows[0].count) + 1;
    return `RLH-2026-${count.toString().padStart(4, '0')}`;
};

async function test() {
    try {
        const fee = parseFloat(process.env.HACKATHON_REGISTRATION_FEE || 199);
        console.log("FEE:", fee);
        const registrationId = await generateRegistrationId();

        const insertRes = await db.query(`
            INSERT INTO hackathon_registrations (
                registration_id, team_name, team_leader_name, team_leader_email, team_leader_phone, team_leader_organization,
                participant_2_name, participant_2_email, participant_2_phone, participant_2_organization,
                participant_3_name, participant_3_email, participant_3_phone, participant_3_organization,
                payment_status, registration_status, registration_fee, currency,
                first_utm_source, first_utm_medium, first_utm_campaign, first_utm_term, first_utm_content,
                session_utm_source, session_utm_medium, session_utm_campaign, session_utm_term, session_utm_content
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
                $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
            ) RETURNING id
        `, [
            registrationId, 'test', 'test', 'test', 'test', 'test',
            'test', 'test', 'test', 'test',
            null, null, null, null,
            'pending', 'pending_payment', fee, 'INR',
            null, null, null, null, null,
            null, null, null, null, null
        ]);

        const dbId = insertRes.rows[0].id;
        console.log("DB Insert success, id:", dbId);

        const options = {
            amount: Math.round(fee * 100),
            currency: 'INR',
            receipt: registrationId,
            payment_capture: 1
        };

        const rzpOrder = await razorpay.orders.create(options);
        console.log("Razorpay success:", rzpOrder.id, "amount:", rzpOrder.amount);

        await db.query(`UPDATE hackathon_registrations SET razorpay_order_id = $1 WHERE id = $2`, [rzpOrder.id, dbId]);
        console.log("Update success");

    } catch (e) {
        console.error("ERROR:");
        console.error(e);
    }
    process.exit(0);
}

test();
