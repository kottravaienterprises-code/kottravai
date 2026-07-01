require('dotenv').config({ path: './server/.env' });
const { sendDailyAnalyticsEmail } = require('./server/services/dailyEmailSender.js');

async function sendMailToAll() {
    try {
        console.log("Sending daily mail to ALL configured recipients...");
        const result = await sendDailyAnalyticsEmail();
        console.log("Result:", result);
        console.log("Done!");
    } catch (e) {
        console.error("Error sending email:", e);
    }
}

sendMailToAll();
