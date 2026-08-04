const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { pool } = require('./db');

async function createTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS otp_verifications (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                phone VARCHAR(20) NOT NULL,
                otp_hash VARCHAR(64) NOT NULL,
                attempts INTEGER DEFAULT 0,
                verified BOOLEAN DEFAULT FALSE,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone ON otp_verifications(phone);
        `);
        console.log("Table created successfully!");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit(0);
    }
}

createTable();
