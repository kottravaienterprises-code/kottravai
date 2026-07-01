require('dotenv').config({ path: './server/.env' });
const { sendDailyAnalyticsEmail } = require('./server/services/dailyEmailSender.js');

async function sendTeamMail() {
    try {
        console.log("Blasting email to the full team configured in .env...");
        const result = await sendDailyAnalyticsEmail();
        console.log("Result:", result);
        console.log("Done!");
    } catch (e) {
        console.error("Error sending email:", e);
    }
}

sendTeamMail();
