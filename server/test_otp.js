const axios = require('axios');

async function runTest() {
    try {
        console.log("Sending OTP to get a record...");
        const sendRes = await axios.post('http://localhost:5001/api/auth/send-whatsapp-otp', {
            phone: '9999999999'
        });
        const otp = sendRes.data.test_otp;
        console.log("Sent OTP successfully. OTP:", otp);
        
        console.log("Verifying OTP...");
        const verifyRes = await axios.post('http://localhost:5001/api/auth/verify-whatsapp-otp', {
            phone: '9999999999',
            otp: otp
        });
        console.log("Verification Response:", verifyRes.data);
    } catch (err) {
        console.error("Axios Error:");
        if (err.response) {
            console.error(err.response.status);
            console.error(err.response.data);
        } else {
            console.error(err.message);
        }
    }
}
runTest();
