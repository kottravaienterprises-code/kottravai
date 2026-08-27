const express = require('express');
const router = express.Router();
const db = require('../db');
const { Parser } = require('json2csv');

// GET /api/admin/hackathon/stats
router.get('/stats', async (req, res) => {
    try {
        const statsRes = await db.query(`
            SELECT 
                COUNT(*) as total_registrations,
                SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_registrations,
                SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_registrations,
                SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) as failed_registrations,
                SUM(CASE WHEN payment_status = 'paid' THEN registration_fee ELSE 0 END) as total_revenue
            FROM hackathon_registrations
        `);

        const utmRes = await db.query(`
            SELECT LOWER(first_utm_source) as source, COUNT(*) as count 
            FROM hackathon_registrations 
            WHERE payment_status = 'paid' AND first_utm_source IS NOT NULL AND first_utm_source != 'none'
            GROUP BY LOWER(first_utm_source)
        `);

        res.json({
            success: true,
            stats: {
                totalRegistrations: parseInt(statsRes.rows[0].total_registrations || 0),
                paidRegistrations: parseInt(statsRes.rows[0].paid_registrations || 0),
                pendingRegistrations: parseInt(statsRes.rows[0].pending_registrations || 0),
                failedRegistrations: parseInt(statsRes.rows[0].failed_registrations || 0),
                totalRevenue: parseFloat(statsRes.rows[0].total_revenue || 0)
            },
            utmSources: utmRes.rows
        });
    } catch (err) {
        console.error('❌ [ADMIN_HACKATHON_STATS_ERROR]', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/hackathon/export
router.get('/export', async (req, res) => {
    try {
        const queryRes = await db.query(`
            SELECT 
                registration_id as "Registration ID",
                team_name as "Team Name",
                team_leader_name as "Team Leader Name",
                team_leader_email as "Team Leader Email",
                team_leader_phone as "Team Leader Phone",
                team_leader_organization as "Team Leader Organization",
                participant_2_name as "Participant 2 Name",
                participant_2_email as "Participant 2 Email",
                participant_2_phone as "Participant 2 Phone",
                participant_2_organization as "Participant 2 Organization",
                participant_3_name as "Participant 3 Name",
                participant_3_email as "Participant 3 Email",
                participant_3_phone as "Participant 3 Phone",
                participant_3_organization as "Participant 3 Organization",
                registration_fee as "Registration Fee",
                currency as "Currency",
                payment_status as "Payment Status",
                registration_status as "Registration Status",
                razorpay_order_id as "Razorpay Order ID",
                razorpay_payment_id as "Razorpay Payment ID",
                paid_at as "Paid At",
                first_utm_source as "First UTM Source",
                first_utm_medium as "First UTM Medium",
                first_utm_campaign as "First UTM Campaign",
                first_utm_content as "First UTM Content",
                first_utm_term as "First UTM Term",
                session_utm_source as "Session UTM Source",
                session_utm_medium as "Session UTM Medium",
                session_utm_campaign as "Session UTM Campaign",
                session_utm_content as "Session UTM Content",
                session_utm_term as "Session UTM Term",
                created_at as "Created At"
            FROM hackathon_registrations
            ORDER BY created_at DESC
        `);

        if (queryRes.rows.length === 0) {
            return res.status(404).send('No records found');
        }

        const json2csv = new Parser();
        const csv = json2csv.parse(queryRes.rows);

        res.header('Content-Type', 'text/csv');
        res.attachment('Rural_Livelihood_Hackathon_2026_Registrations.csv');
        return res.send(csv);

    } catch (err) {
        console.error('❌ [ADMIN_HACKATHON_EXPORT_ERROR]', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
