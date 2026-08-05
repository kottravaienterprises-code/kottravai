const axios = require('axios');
const { Client } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const dbUrl = String(process.env.DATABASE_URL);
const db = new Client({ connectionString: dbUrl });

const API_BASE = 'http://localhost:5174/api/auth';
const testPassword = 'Password123!';
const mockOTP = '123456';
const guestPhone = '9000000006';
const guestUsername = `guest_${guestPhone}`;
const guestEmail = 'guest_upgraded2@example.com';

async function runTest10() {
  await db.connect();
  console.log("Database connected.\n");

  try {
    console.log('====================================================');
    console.log('TEST 10 - Guest Checkout Migration Only');
    console.log('====================================================');
    
    // Cleanup Supabase User
    const { data: users } = await supabase.auth.admin.listUsers();
    const userToDelete = users.users.find(u => u.email === guestEmail || (u.phone && u.phone.includes(guestPhone)));
    if (userToDelete) await supabase.auth.admin.deleteUser(userToDelete.id);

    // Cleanup PostgreSQL
    await db.query("DELETE FROM users WHERE mobile = $1 OR username = $2", [guestPhone, guestUsername]);
    await db.query("DELETE FROM otp_verifications WHERE phone = $1", [guestPhone]);
    await db.query("DELETE FROM wishlist WHERE username = $1 OR username = $2", [guestUsername, guestEmail.split('@')[0]]);
    
    // Provision guest manually
    const guestRes = await db.query("INSERT INTO users (mobile, is_guest, username, password) VALUES ($1, TRUE, $2, 'dummy_pass') RETURNING id", [guestPhone, guestUsername]);
    const guestId = guestRes.rows[0].id;
    console.log(`Created Guest User ID: ${guestId}`);
    
    await db.query("INSERT INTO wishlist (username, product_id) VALUES ($1, (SELECT id FROM products LIMIT 1))", [guestUsername]);
    console.log(`Wishlist item added for guest`);

    // Register guest
    console.log(`Registering guest to permanent account...`);
    // Need mock OTP for guest
    await db.query("INSERT INTO otp_verifications (phone, otp_hash, verified, expires_at) VALUES ($1, $2, TRUE, NOW() + INTERVAL '5 minutes')", [guestPhone, crypto.createHash('sha256').update(mockOTP).digest('hex')]);
    
    const guestRegRes = await axios.post(`${API_BASE}/register`, {
      email: guestEmail,
      mobile: guestPhone,
      otp: mockOTP,
      password: testPassword,
      username: guestEmail.split('@')[0]
    });
    console.log(`Guest Registration HTTP Status: ${guestRegRes.status}`);

    const newAuthUserId = guestRegRes.data.user.id;
    console.log(`Migrated to New User ID: ${newAuthUserId}`);

    // Verify wishlist migrated
    const migratedWishlist = await db.query("SELECT * FROM wishlist WHERE username = $1", [guestEmail.split('@')[0]]);
    console.log(`Migrated wishlist rows: ${migratedWishlist.rows.length}`);
    if (migratedWishlist.rows.length === 0) throw new Error("TEST 10 FAILED: Wishlist not migrated");
    
    // Verify old guest deleted
    const oldGuestCheck = await db.query("SELECT * FROM users WHERE id = $1", [guestId]);
    if (oldGuestCheck.rows.length > 0) throw new Error("TEST 10 FAILED: Old guest record not deleted");
    console.log(`Old guest record successfully deleted from users table.`);
    console.log('PASS');

  } catch (err) {
    console.log('\n--- ERROR / FAIL ---');
    console.error(err.response ? JSON.stringify(err.response.data) : err.message);
  } finally {
    await db.end();
  }
}

runTest10();
