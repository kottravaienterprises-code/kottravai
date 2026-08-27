const db = require('../db');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { sendEmail } = require('../utils/mailer');
const { getHackathonParticipantTemplate, getHackathonAdminTemplate } = require('../utils/emailTemplates');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const generateRegistrationId = async () => {
    const res = await db.query(`SELECT count(*) FROM hackathon_registrations`);
    const count = parseInt(res.rows[0].count) + 1;
    return `RLH-2026-${count.toString().padStart(4, '0')}`;
};

const registerHackathon = async (req, res) => {
    try {
        const data = req.body;
        const fee = parseFloat(process.env.HACKATHON_REGISTRATION_FEE || 199);
        const registrationId = await generateRegistrationId();

        // 1. Insert into DB (Pending)
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
            registrationId, data.teamName, data.leaderName, data.leaderEmail, data.leaderPhone, data.leaderOrg,
            data.part2Name, data.part2Email, data.part2Phone, data.part2Org,
            data.part3Name || null, data.part3Email || null, data.part3Phone || null, data.part3Org || null,
            'pending', 'pending_payment', fee, 'INR',
            data.first_utm_source, data.first_utm_medium, data.first_utm_campaign, data.first_utm_term, data.first_utm_content,
            data.session_utm_source, data.session_utm_medium, data.session_utm_campaign, data.session_utm_term, data.session_utm_content
        ]);

        const dbId = insertRes.rows[0].id;

        // 2. Generate Razorpay Order
        const options = {
            amount: Math.round(fee * 100),
            currency: 'INR',
            receipt: registrationId,
            payment_capture: 1
        };

        const rzpOrder = await razorpay.orders.create(options);

        // 3. Save razorpay_order_id
        await db.query(`UPDATE hackathon_registrations SET razorpay_order_id = $1 WHERE id = $2`, [rzpOrder.id, dbId]);

        res.status(200).json({
            success: true,
            order_id: rzpOrder.id,
            amount: options.amount,
            currency: options.currency,
            registration_id: registrationId,
            db_id: dbId
        });

    } catch (err) {
        console.error('❌ [HACKATHON_REGISTER_ERROR]', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const verifyHackathonPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, registration_id } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                                        .update(body.toString())
                                        .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            console.error('❌ [HACKATHON_VERIFY_FAILED] Invalid signature');
            
            // Mark as failed in DB if we know the order ID
            if (razorpay_order_id) {
                await db.query(`UPDATE hackathon_registrations SET payment_status = 'failed' WHERE razorpay_order_id = $1`, [razorpay_order_id]);
            }
            
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        // 1. Idempotency Check
        const checkRes = await db.query(`SELECT * FROM hackathon_registrations WHERE razorpay_order_id = $1`, [razorpay_order_id]);
        const registration = checkRes.rows[0];

        if (!registration) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }

        if (registration.payment_status === 'paid') {
            return res.status(200).json({ success: true, message: 'Already verified' });
        }

        // 2. Update DB
        await db.query(`
            UPDATE hackathon_registrations 
            SET payment_status = 'paid', registration_status = 'confirmed', razorpay_payment_id = $1, paid_at = NOW() 
            WHERE id = $2
        `, [razorpay_payment_id, registration.id]);

        console.log(`✅ [HACKATHON_VERIFIED] Reg ID: ${registration.registration_id}`);

        // 3. Send Emails
        try {
            // Send Email to Participant
            await sendEmail({
                to: registration.team_leader_email,
                subject: `Rural Livelihood Design Hackathon 2026 - Registration Confirmed`,
                html: getHackathonParticipantTemplate(registration),
                type: 'hackathon_participant'
            });

            // Send Email to Admin
            await sendEmail({
                to: process.env.ADMIN_EMAIL || 'admin@kottravai.com',
                subject: `New Rural Livelihood Hackathon Registration - ${registration.registration_id}`,
                html: getHackathonAdminTemplate(registration),
                type: 'hackathon_admin'
            });
        } catch (emailErr) {
            console.error('❌ [HACKATHON_EMAIL_ERROR]', emailErr);
        }

        res.status(200).json({ success: true, message: 'Payment verified successfully' });

    } catch (err) {
        console.error('❌ [HACKATHON_VERIFY_ERROR]', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    registerHackathon,
    verifyHackathonPayment
};
