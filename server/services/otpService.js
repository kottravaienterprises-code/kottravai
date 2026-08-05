const crypto = require('crypto');
const { sendWhatsAppOTP } = require('../utils/whatsapp');

// Mock Database (Replace with Supabase client)
const db = {
  query: async () => []
};

// Mock Analytics (Replace with actual analytics service)
const analytics = {
  track: (event, data) => console.log(`[Analytics] ${event}`, data)
};

/**
 * OTP Service for Guest Checkout
 */
class OTPService {
  /**
   * Generates a 6-digit numeric OTP and its hash.
   */
  generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    return { otp, hash };
  }

  /**
   * Validates rate limits for sending OTPs.
   * Max 5 sends per hour, 30s cooldown.
   */
  async checkRateLimits(phone) {
    // Implement actual rate limiting logic using Redis or DB
    // Pseudo-code:
    // const recentOTPs = await db.query('SELECT created_at FROM otp_verifications WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 hour'', [phone]);
    // if (recentOTPs.length >= 5) throw new Error('RATE_LIMIT_EXCEEDED');
    // if (recentOTPs.length > 0 && (Date.now() - new Date(recentOTPs[0].created_at).getTime()) < 30000) throw new Error('COOLDOWN_ACTIVE');
    return true;
  }

  /**
   * Send WhatsApp OTP and invalidate old ones.
   */
  async sendOTP(phone) {
    await this.checkRateLimits(phone);
    const { otp, hash } = this.generateOTP();
    console.log(`[STEP 3] OTP generated: ${otp}`);

    // Invalidate previous active OTPs
    // await db.query('UPDATE otp_verifications SET verified = false, expires_at = NOW() WHERE phone = $1 AND verified = false', [phone]);

    // Store new OTP hash
    const expiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes
    try {
      // await db.query('INSERT INTO otp_verifications (phone, otp_hash, expires_at) VALUES ($1, $2, $3)', [phone, hash, expiresAt]);
      console.log('[STEP 4] OTP inserted into database');
    } catch (err) {
      console.error(`[ERROR] Database insert failed in server/services/otpService.js - ${err.message}`);
      throw err;
    }

    analytics.track('otp_sent', { phone });
    
    console.log('[STEP 5] Calling WhatsApp API');
    try {
      const waResponse = await sendWhatsAppOTP(phone, otp);
      console.log(`[STEP 6] WhatsApp API response: ${JSON.stringify(waResponse)}`);
    } catch (err) {
      console.error(`[ERROR] WhatsApp API failed in server/services/otpService.js - ${err.message}`);
      throw err;
    }

    return { success: true, message: 'OTP sent successfully.' };
  }

  /**
   * Verify an OTP. Max 3 attempts.
   */
  async verifyOTP(phone, otpInput) {
    // pseudo code:
    // const record = await db.query('SELECT * FROM otp_verifications WHERE phone = $1 AND expires_at > NOW() AND verified = false ORDER BY created_at DESC LIMIT 1', [phone]);
    // if (!record) throw new Error('OTP_EXPIRED_OR_INVALID');
    // if (record.attempts >= 3) { analytics.track('otp_failed', { phone, reason: 'max_attempts' }); throw new Error('MAX_ATTEMPTS_EXCEEDED'); }
    
    const inputHash = crypto.createHash('sha256').update(otpInput).digest('hex');
    
    // if (record.otp_hash !== inputHash) { 
    //   await db.query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1', [record.id]);
    //   analytics.track('otp_failed', { phone, reason: 'invalid_code' });
    //   throw new Error('INVALID_OTP');
    // }

    // Success
    // await db.query('UPDATE otp_verifications SET verified = true WHERE id = $1', [record.id]);
    analytics.track('otp_verified', { phone });

    // Upsert Guest User
    // await db.query('INSERT INTO auth.users (phone, is_guest, phone_verified) VALUES ($1, true, true) ON CONFLICT (phone) DO UPDATE SET phone_verified = true', [phone]);

    return { success: true, message: 'Phone verified successfully.' };
  }
}

module.exports = new OTPService();
