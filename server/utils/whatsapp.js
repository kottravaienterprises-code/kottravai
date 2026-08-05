const axios = require('axios');
require('dotenv').config();

/**
 * Send WhatsApp OTP via ASKEVA API
 * @param {string} mobile - 10-digit mobile number
 * @param {string} otp - 6-digit OTP
 * @param {string} type - 'signup' or 'forgot' (placeholder for template selection)
 * @returns {Promise<Object>} - API response
 */
const sendWhatsAppOTP = async (mobile, otp, type = 'signup') => {
    const ASKEVA_TOKEN = process.env.ASKEVA_TOKEN;
    const TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || 'otp_verification';

    // ASKEVA URL with token as query parameter
    const ASKEVA_URL = `https://backend.askeva.io/v1/message/send-message?token=${ASKEVA_TOKEN}`;

    // Safely add 91 prefix for India (handle cases where a 10-digit number happens to start with 91)
    let formattedMobile = mobile.toString().replace(/[\s\-\+]/g, '');
    if (formattedMobile.length === 10) {
        formattedMobile = '91' + formattedMobile;
    } else if (formattedMobile.startsWith('0')) {
        formattedMobile = '91' + formattedMobile.slice(1);
    }
    
    console.log(`📱 Sending ASKEVA WhatsApp OTP to ${formattedMobile}...`);

    if (!ASKEVA_TOKEN) {
        console.warn('⚠️  ASKEVA_TOKEN not found in .env - WhatsApp OTP will log to console ONLY.');
        return { success: true, simulated: true };
    }

    try {
        const response = await axios.post(ASKEVA_URL, {
            "to": formattedMobile,
            "type": "template",
            "template": {
                "language": {
                    "policy": "deterministic",
                    "code": "en"
                },
                "name": TEMPLATE_NAME,
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {
                                "type": "text",
                                "text": otp
                            }
                        ]
                    },
                    {
                        "type": "button",
                        "sub_type": "url",
                        "index": "0",
                        "parameters": [
                            {
                                "type": "text",
                                "text": otp
                            }
                        ]
                    }
                ]
            }
        }, { timeout: 3000 }); // Hard 3-second timeout so the frontend doesn't hang

        console.log('✅ ASKEVA WhatsApp OTP sent successfully:', response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ ASKEVA WhatsApp Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to send WhatsApp message via ASKEVA');
    }
};

/**
 * Send a custom WhatsApp message via ASKEVA API
 * @param {string} phone - Mobile number
 * @param {string} message - The text message to send
 * @returns {Promise<Object>} - API response
 */
const sendWhatsAppMessage = async (phone, message) => {
    const ASKEVA_TOKEN = process.env.ASKEVA_TOKEN;
    // Using the verified working Base URL from the OTP login flow
    const ASKEVA_URL = `https://backend.askeva.io/v1/message/send-message?token=${ASKEVA_TOKEN}`;

    // Sanitize: strip spaces, dashes, +91, leading 0
    let sanitized = phone.toString().replace(/[\s\-\+]/g, '');
    if (sanitized.startsWith('91') && sanitized.length === 12) {
        // already correct
    } else if (sanitized.startsWith('0')) {
        sanitized = '91' + sanitized.slice(1);
    } else if (sanitized.length === 10) {
        sanitized = '91' + sanitized;
    }

    console.log(`📱 Sending ASKEVA WhatsApp Message to ${sanitized}...`);

    if (!ASKEVA_TOKEN) {
        console.warn('⚠️  ASKEVA_TOKEN not found - WhatsApp message simulation only.');
        console.log(`\n[WHATSAPP SIMULATION] To: ${sanitized} | Message: ${message}\n`);
        return { success: true, simulated: true };
    }

    try {
        // The backend.askeva.io endpoint uses a structured JSON body with "type": "text"
        const response = await axios.post(ASKEVA_URL, {
            "to": sanitized,
            "type": "text",
            "text": {
                "body": message
            }
        }, { timeout: 3000 });

        console.log('✅ WhatsApp message sent:', response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ WhatsApp Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to send WhatsApp message via ASKEVA');
    }
};

/**
 * Send WhatsApp order confirmation via ASKEVA API
 * @param {string} phone - Recipient phone number
 * @param {string} orderId - The order ID
 * @param {string} customerName - The customer name
 */
const sendWhatsAppOrderConfirmation = async (phone, orderId, customerName) => {
    const ASKEVA_TOKEN = process.env.ASKEVA_TOKEN;
    const ASKEVA_URL = `https://backend.askeva.io/v1/message/send-message?token=${ASKEVA_TOKEN}`;

    // Sanitize: strip spaces, dashes, +91, leading 0
    let sanitized = phone.toString().replace(/[\s\-\+]/g, '');
    if (sanitized.startsWith('91') && sanitized.length === 12) {
        // already correct
    } else if (sanitized.startsWith('0')) {
        sanitized = '91' + sanitized.slice(1);
    } else if (sanitized.length === 10) {
        sanitized = '91' + sanitized;
    }

    if (!ASKEVA_TOKEN) {
        console.warn('⚠️  ASKEVA_TOKEN not found - WhatsApp order confirmation simulation only.');
        return { success: true, simulated: true };
    }

    try {
        const response = await axios.post(ASKEVA_URL, {
            "to": sanitized,
            "type": "template",
            "template": {
                "language": {
                    "policy": "deterministic",
                    "code": "en"
                },
                "name": "testapitemp", // From user provided curl
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {
                                "type": "text",
                                "text": orderId.toString()
                            },
                            {
                                "type": "text",
                                "text": customerName
                            }
                        ]
                    }
                ]
            }
        }, { timeout: 3000 });

        console.log(`✅ ASKEVA Order Confirmation sent to ${sanitized}:`, response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ ASKEVA WhatsApp Order Error:', error.response?.data || error.message);
        // We log but don't throw to avoid breaking order flow
        return { success: false, error: error.message };
    }
};

/**
 * Send Alliance Approval notification via ASKEVA API
 * @param {string} phone - Recipient phone number
 * @param {string} name - Partner name
 * @param {string} password - Generated password
 * @param {string} referralCode - Generated referral code
 */
const sendAllianceApprovalWhatsApp = async (phone, name, password, referralCode) => {
    const ASKEVA_TOKEN = process.env.ASKEVA_TOKEN;
    const ASKEVA_URL = `https://backend.askeva.io/v1/message/send-message?token=${ASKEVA_TOKEN}`;

    let sanitized = phone.toString().replace(/[\s\-\+]/g, '');
    if (sanitized.startsWith('91') && sanitized.length === 12) {
        // already correct
    } else if (sanitized.startsWith('0')) {
        sanitized = '91' + sanitized.slice(1);
    } else if (sanitized.length === 10) {
        sanitized = '91' + sanitized;
    }

    if (!phone || phone.toString().length < 10) {
        console.warn('⚠️  Invalid phone number for Alliance Approval:', phone);
        return { success: false, error: 'Invalid phone number' };
    }

    if (!ASKEVA_TOKEN) {
        console.warn(`⚠️  ASKEVA_TOKEN not found - Alliance approval simulation for ${phone}`);
        return { success: true, simulated: true };
    }

    try {
        const response = await axios.post(ASKEVA_URL, {
            "to": sanitized,
            "type": "template",
            "template": {
                "language": {
                    "policy": "deterministic",
                    "code": "en"
                },
                "name": "kottravai_alliance_approval",
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            { "type": "text", "text": name }
                        ]
                    }
                ]
            }
        });

        console.log(`✅ Alliance approval WhatsApp sent to: ${sanitized}`);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Alliance WhatsApp Approval failed:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Alliance Rejection notification via ASKEVA API
 * @param {string} phone - Recipient phone number
 * @param {string} name - Partner name
 */
const sendAllianceRejectionWhatsApp = async (phone, name) => {
    const ASKEVA_TOKEN = process.env.ASKEVA_TOKEN;
    const ASKEVA_URL = `https://backend.askeva.io/v1/message/send-message?token=${ASKEVA_TOKEN}`;

    let sanitized = phone.toString().replace(/[\s\-\+]/g, '');
    if (sanitized.startsWith('91') && sanitized.length === 12) {
        // already correct
    } else if (sanitized.startsWith('0')) {
        sanitized = '91' + sanitized.slice(1);
    } else if (sanitized.length === 10) {
        sanitized = '91' + sanitized;
    }

    if (!phone || phone.toString().length < 10) {
        console.warn('⚠️  Invalid phone number for Alliance Rejection:', phone);
        return { success: false, error: 'Invalid phone number' };
    }

    if (!ASKEVA_TOKEN) {
        console.warn(`⚠️  ASKEVA_TOKEN not found - Alliance rejection simulation for ${phone}`);
        return { success: true, simulated: true };
    }

    try {
        const response = await axios.post(ASKEVA_URL, {
            "to": sanitized,
            "type": "template",
            "template": {
                "language": {
                    "policy": "deterministic",
                    "code": "en"
                },
                "name": "kottravai_alliance_rejection",
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            { "type": "text", "text": name }
                        ]
                    }
                ]
            }
        });

        console.log(`✅ Alliance rejection WhatsApp sent to: ${sanitized}`);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Alliance WhatsApp Rejection failed:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendWhatsAppOTP,
    sendWhatsAppMessage,
    sendWhatsAppOrderConfirmation,
    sendAllianceApprovalWhatsApp,
    sendAllianceRejectionWhatsApp
};
