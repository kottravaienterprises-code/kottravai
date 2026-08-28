const db = require('./db');

async function run() {
    try {
        console.log('Altering schema...');
        await db.query(`
            ALTER TABLE hackathon_registrations 
            ADD COLUMN IF NOT EXISTS registration_id VARCHAR(50) UNIQUE,
            ADD COLUMN IF NOT EXISTS registration_fee NUMERIC DEFAULT 0,
            ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
            ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
        `);
        console.log('Schema updated successfully');
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
