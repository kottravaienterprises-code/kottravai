require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const otpService = require('./services/otpService');

(async () => {
    try {
        const result = await otpService.sendOTP('9999999999');
        console.log('Final Result:', result);
    } catch(e) {
        console.error('Final Error:', e);
    }
})();
