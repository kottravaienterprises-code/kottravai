require('dotenv').config();
const db = require('./db');

async function migrate() {
    try {
        console.log("Adding customization columns to products table...");
        await db.query(`
            ALTER TABLE products ADD COLUMN IF NOT EXISTS is_customizable BOOLEAN DEFAULT FALSE;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS customization_charge NUMERIC(10,2) DEFAULT 100;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_image_upload BOOLEAN DEFAULT FALSE;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_custom_text BOOLEAN DEFAULT FALSE;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_special_instructions BOOLEAN DEFAULT FALSE;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS max_text_length INTEGER DEFAULT 50;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS max_file_size INTEGER DEFAULT 5;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS allowed_file_types JSONB DEFAULT '["JPG", "JPEG", "PNG", "WEBP"]'::jsonb;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS customizable_tag VARCHAR(50) DEFAULT 'CUSTOMIZABLE';
        `);
        console.log("Migration successful!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
