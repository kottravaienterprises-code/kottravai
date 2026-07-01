const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sendTestDailyEmail } = require('../services/dailyEmailSender');

async function runTest() {
    console.log("Invoking sendTestDailyEmail with a custom date '2026-06-21'...");
    const result = await sendTestDailyEmail('santhoshsaram001@gmail.com', '2026-06-21');
    console.log("Result:", result);
    process.exit(0);
}

runTest();
