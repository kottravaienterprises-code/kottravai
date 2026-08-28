const fs = require('fs');

let content = fs.readFileSync('utils/emailTemplates.js', 'utf8');

const appendCode = `
const getHackathonParticipantTemplate = (data) => {
    const content = \`
        <h2 style="color: #2D1B4E;">🌿 Registration Confirmed: Rural Livelihood Design Hackathon 2026</h2>
        <p>Dear <strong>\${data.team_leader_name}</strong>,</p>
        <p>Thank you for registering your team <strong>\${data.team_name}</strong> for the <strong>Rural Livelihood Design Hackathon 2026</strong>. We have successfully received your payment of <strong>₹\${data.registration_fee}</strong>.</p>

        <div style="background: linear-gradient(135deg, #fdf4fc, #f0faf0); padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #e8d4f0;">
            <h3 style="color: #8E2A8B; margin-top: 0; margin-bottom: 16px;">📋 Registration Details</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 8px 4px; color: #666; width: 40%;"><strong>Registration ID</strong></td><td style="padding: 8px 4px; color: #333; font-weight: bold;">\${data.registration_id}</td></tr>
                <tr style="background: #fff8fe;"><td style="padding: 8px 4px; color: #666;"><strong>Team Name</strong></td><td style="padding: 8px 4px; color: #333;">\${data.team_name}</td></tr>
                <tr><td style="padding: 8px 4px; color: #666;"><strong>Team Leader</strong></td><td style="padding: 8px 4px; color: #333;">\${data.team_leader_name}</td></tr>
                \${data.participant_2_name ? \`<tr style="background: #fff8fe;"><td style="padding: 8px 4px; color: #666;"><strong>Participant 2</strong></td><td style="padding: 8px 4px; color: #333;">\${data.participant_2_name}</td></tr>\` : ''}
                \${data.participant_3_name ? \`<tr><td style="padding: 8px 4px; color: #666;"><strong>Participant 3</strong></td><td style="padding: 8px 4px; color: #333;">\${data.participant_3_name}</td></tr>\` : ''}
            </table>
        </div>

        <div style="background-color: #f0faf4; border-left: 4px solid #22c55e; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-weight: bold; color: #166534;">✅ Payment Confirmed — ₹\${data.registration_fee}</p>
        </div>

        <p><strong>Event Details:</strong></p>
        <ul>
            <li><strong>Event:</strong> Rural Livelihood Design Hackathon 2026</li>
            <li><strong>Venue:</strong> VIT Chennai</li>
            <li><strong>Date:</strong> To Be Announced</li>
        </ul>

        <p>We will share the participant guidelines and next steps soon. Please keep this email for your records.</p>
        <p style="margin-top: 32px;">With warmth and anticipation,<br><strong>Team Kottravai</strong></p>
    \`;
    return getBaseLayout(content);
};

const getHackathonAdminTemplate = (data) => {
    const content = \`
        <h2>🌿 New Hackathon Registration: \${data.registration_id}</h2>
        <p>A new team has registered for the Rural Livelihood Design Hackathon 2026.</p>

        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 10px; color: #2D1B4E;">👥 Team Details</h3>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 6px 4px; color: #666; width: 40%;"><strong>Team Name</strong></td><td style="padding: 6px 4px;">\${data.team_name}</td></tr>
                <tr style="background:#f0f0f0;"><td style="padding: 6px 4px; color: #666;"><strong>Leader Name</strong></td><td style="padding: 6px 4px;">\${data.team_leader_name}</td></tr>
                <tr><td style="padding: 6px 4px; color: #666;"><strong>Leader Email</strong></td><td style="padding: 6px 4px;"><a href="mailto:\${data.team_leader_email}">\${data.team_leader_email}</a></td></tr>
                <tr style="background:#f0f0f0;"><td style="padding: 6px 4px; color: #666;"><strong>Leader Phone</strong></td><td style="padding: 6px 4px;">\${data.team_leader_phone}</td></tr>
                <tr><td style="padding: 6px 4px; color: #666;"><strong>Leader Org</strong></td><td style="padding: 6px 4px;">\${data.team_leader_organization}</td></tr>
            </table>

            <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 10px; color: #2D1B4E; margin-top: 20px;">💳 Payment Details</h3>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 6px 4px; color: #666; width: 40%;"><strong>Registration ID</strong></td><td style="padding: 6px 4px; font-weight: bold;">\${data.registration_id}</td></tr>
                <tr style="background:#f0f0f0;"><td style="padding: 6px 4px; color: #666;"><strong>Amount</strong></td><td style="padding: 6px 4px; color: #16a34a; font-weight: bold;">₹\${data.registration_fee}</td></tr>
                <tr><td style="padding: 6px 4px; color: #666;"><strong>Razorpay Payment ID</strong></td><td style="padding: 6px 4px;">\${data.razorpay_payment_id}</td></tr>
                <tr style="background:#f0f0f0;"><td style="padding: 6px 4px; color: #666;"><strong>Razorpay Order ID</strong></td><td style="padding: 6px 4px;">\${data.razorpay_order_id}</td></tr>
                <tr><td style="padding: 6px 4px; color: #666;"><strong>Status</strong></td><td style="padding: 6px 4px;">\${data.payment_status}</td></tr>
            </table>

            <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 10px; color: #2D1B4E; margin-top: 20px;">📊 UTM Tracking</h3>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 6px 4px; color: #666; width: 40%;"><strong>First Source</strong></td><td style="padding: 6px 4px;">\${data.first_utm_source || 'N/A'}</td></tr>
                <tr style="background:#f0f0f0;"><td style="padding: 6px 4px; color: #666;"><strong>First Medium</strong></td><td style="padding: 6px 4px;">\${data.first_utm_medium || 'N/A'}</td></tr>
                <tr><td style="padding: 6px 4px; color: #666;"><strong>First Campaign</strong></td><td style="padding: 6px 4px;">\${data.first_utm_campaign || 'N/A'}</td></tr>
                <tr style="background:#f0f0f0;"><td style="padding: 6px 4px; color: #666;"><strong>Session Source</strong></td><td style="padding: 6px 4px;">\${data.session_utm_source || 'N/A'}</td></tr>
            </table>
        </div>
    \`;
    return getBaseLayout(content);
};
`;

content = content.replace('module.exports = {', 'module.exports = {\n    getHackathonParticipantTemplate,\n    getHackathonAdminTemplate,');

content = content.replace('// ──────────────────────────────────────────────────────────────\n// மண் வாசம் Camp Registration Email Templates', appendCode + '\n// ──────────────────────────────────────────────────────────────\n// மண் வாசம் Camp Registration Email Templates');

fs.writeFileSync('utils/emailTemplates.js', content);
console.log('Templates appended');
