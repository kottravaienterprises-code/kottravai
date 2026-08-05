const express = require('express');
const router = express.Router();
const otpService = require('../../services/otpService');
const crypto = require('crypto');

// Mock Analytics
const analytics = {
  track: (event, data) => console.log(`[Analytics] ${event}`, data)
};

/**
 * POST /api/auth/send-whatsapp-otp
 */
router.post('/send-whatsapp-otp', async (req, res) => {
  try {
    console.log('[STEP 1] Request received - POST /api/auth/send-whatsapp-otp');
    const { phone } = req.body;
    console.log(`[STEP 2] Mobile number: ${phone}`);
    if (!phone) {
      console.error('[ERROR] Phone number missing in payload');
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    analytics.track('guest_checkout_started', { phone });
    const result = await otpService.sendOTP(phone);
    console.log(`[STEP 7] Final HTTP response: ${JSON.stringify(result)}`);
    res.json(result);
  } catch (error) {
    console.error(`[ERROR] Exception in send-whatsapp-otp handler: ${error.message}`);
    res.status(429).json({ error: error.message });
  }
});

/**
 * POST /api/auth/resend-whatsapp-otp
 */
router.post('/resend-whatsapp-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

    const result = await otpService.sendOTP(phone);
    res.json(result);
  } catch (error) {
    res.status(429).json({ error: error.message });
  }
});

/**
 * POST /api/auth/verify-whatsapp-otp
 */
router.post('/verify-whatsapp-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required.' });

    const result = await otpService.verifyOTP(phone, otp);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/auth/create-guest-session
 */
router.post('/create-guest-session', async (req, res) => {
  try {
    const { phone, browser, device } = req.body;
    const ip_address = req.ip;

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Pseudo code:
    // await db.query('INSERT INTO guest_sessions (customer_id, session_token, browser, device, ip_address, expires_at) VALUES ((SELECT id FROM auth.users WHERE phone = $1), $2, $3, $4, $5, $6)', [phone, sessionToken, browser, device, ip_address, expiresAt]);

    res.cookie('guest_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt
    });

    res.json({ success: true, message: 'Session created.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session.' });
  }
});

/**
 * GET /api/auth/guest-profile
 */
router.get('/guest-profile', async (req, res) => {
  try {
    const token = req.cookies?.guest_session || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    // Pseudo code:
    // const session = await db.query('SELECT * FROM guest_sessions WHERE session_token = $1 AND is_active = true AND expires_at > NOW()', [token]);
    // if (!session) return res.status(401).json({ error: 'Session expired.' });
    // await db.query('UPDATE guest_sessions SET last_activity_at = NOW() WHERE session_token = $1', [token]);
    // const profile = await db.query('SELECT phone, name, email, is_guest FROM auth.users WHERE id = $1', [session.customer_id]);

    res.json({ profile: { phone: '+919999999999', is_guest: true } }); // Mock response
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/auth/logout-guest
 */
router.post('/logout-guest', async (req, res) => {
  try {
    const token = req.cookies?.guest_session || req.headers.authorization?.split(' ')[1];
    if (token) {
      // await db.query('UPDATE guest_sessions SET is_active = false WHERE session_token = $1', [token]);
      res.clearCookie('guest_session');
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed.' });
  }
});

module.exports = router;
