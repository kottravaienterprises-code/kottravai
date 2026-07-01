require('dotenv').config({ path: './server/.env' });
const { sendTestDailyEmail } = require('./server/services/dailyEmailSender.js');

async function sendMail() {
    try {
        console.log("Sending email to santhoshsaram001@gmail.com...");
        const result = await sendTestDailyEmail('santhoshsaram001@gmail.com');
        
        console.log("Result:", result);
        console.log("Done!");
    } catch (e) {
        console.error("Error sending email:", e);
    }
}

sendMail();
