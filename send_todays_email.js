const { sendTestDailyEmail } = require('./server/services/dailyEmailSender');

async function sendTodayEmail() {
    console.log('Sending email...');
    
    // Get today's date in IST
    const now = new Date();
    const utcNow = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istNow = new Date(utcNow + (330 * 60000));
    
    const targetDateStr = istNow.getFullYear() + '-' + String(istNow.getMonth() + 1).padStart(2, '0') + '-' + String(istNow.getDate()).padStart(2, '0');
    
    try {
        const result = await sendTestDailyEmail('santhoshsaram001@gmail.com', targetDateStr);
        console.log('Result:', result);
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

require('dotenv').config();
sendTodayEmail();
