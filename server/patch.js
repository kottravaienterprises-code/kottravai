const fs = require('fs');

const path = 'c:/Users/santh/OneDrive - WisRight Technologies Private Limited/Pictures/Kottravai-main/server/index.js';
let content = fs.readFileSync(path, 'utf8');

const target = `        // Create Guest Session
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        try {
            await db.query(
                'INSERT INTO guest_sessions (customer_id, session_token, is_active, expires_at) VALUES ($1, $2, TRUE, $3)',
                [customerId, sessionToken, sessionExpiresAt]
            );
            console.log('[GUEST_SESSION_CREATED] Guest session persisted to database');
        } catch (dbErr) {
            console.error('[SUPABASE_ERROR] Failed to insert guest session:', dbErr.message);
            throw new Error('Database session insertion failed');
        }

        // Set HttpOnly Cookie
        try {
            res.cookie('guest_session', sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });
            console.log('[COOKIE_SET] guest_session HttpOnly cookie attached to response');
        } catch (cookieErr) {
            console.error('[COOKIE_ERROR] Failed to set session cookie:', cookieErr.message);
            throw new Error('Cookie creation failed');
        }

        console.log('[OTP_VERIFY_COMPLETE] Verification process completely successful');
        res.json({ success: true, message: 'Guest session created', customer_id: customerId });`;

const replacement = `        console.log('[OTP_VERIFY_COMPLETE] Verification process completely successful');
        res.json({ success: true, message: 'OTP verified successfully' });`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('File patched successfully.');
} else {
    console.log('Target string not found in index.js');
}
