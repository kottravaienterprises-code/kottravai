require('dotenv').config({ path: './server/.env' });
const { sendTestDailyEmail } = require('./server/services/dailyEmailSender.js');

async function sendMail() {
    try {
        console.log("Sending email for yesterday (2026-06-24) to santhoshsaram001@gmail.com...");
        const result = await sendTestDailyEmail('santhoshsaram001@gmail.com', '2026-06-24');
        
        console.log("Result:", result);
        console.log("Done!");
    } catch (e) {
        console.error("Error sending email:", e);
    }
}

sendMail();
