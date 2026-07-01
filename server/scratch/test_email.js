const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mailer = require('../utils/mailer');

async function testMail() {
    try {
        console.log("Testing email functionality...");
        const result = await mailer.sendEmail({
            to: 'santhoshsaram001@gmail.com',
            subject: 'Test Email from Kottravai System',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Hello from Kottravai!</h2>
                    <p>This is a test email sent automatically by the system to verify that the SMTP configuration is working perfectly.</p>
                    <p>Have a great day!</p>
                </div>
            `,
            type: 'contact'
        });
        console.log("Email Result:", result);
        process.exit(0);
    } catch (e) {
        console.error("Email sending failed:", e);
        process.exit(1);
    }
}

testMail();
