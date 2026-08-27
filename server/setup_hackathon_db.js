const db = require('./db');

async function run() {
    try {
        console.log('Creating hackathon_registrations table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS hackathon_registrations (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                product_id UUID,
                team_name VARCHAR(255) NOT NULL,
                team_leader_name VARCHAR(255) NOT NULL,
                team_leader_email VARCHAR(255) NOT NULL,
                team_leader_phone VARCHAR(20) NOT NULL,
                team_leader_organization VARCHAR(255) NOT NULL,
                participant_2_name VARCHAR(255) NOT NULL,
                participant_2_email VARCHAR(255) NOT NULL,
                participant_2_phone VARCHAR(20) NOT NULL,
                participant_2_organization VARCHAR(255) NOT NULL,
                participant_3_name VARCHAR(255),
                participant_3_email VARCHAR(255),
                participant_3_phone VARCHAR(20),
                participant_3_organization VARCHAR(255),
                order_id VARCHAR(255),
                razorpay_payment_id VARCHAR(255),
                payment_status VARCHAR(50) DEFAULT 'pending',
                registration_status VARCHAR(50) DEFAULT 'pending',
                first_utm_source VARCHAR(100),
                first_utm_medium VARCHAR(100),
                first_utm_campaign VARCHAR(100),
                first_utm_term VARCHAR(100),
                first_utm_content VARCHAR(100),
                session_utm_source VARCHAR(100),
                session_utm_medium VARCHAR(100),
                session_utm_campaign VARCHAR(100),
                session_utm_term VARCHAR(100),
                session_utm_content VARCHAR(100),
                visitor_id VARCHAR(255),
                session_id VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table created.');

        console.log('Inserting hackathon product...');
        const res = await db.query(`
            INSERT INTO products (
                name, price, category, image, slug, category_slug, short_description, description, is_live, is_customizable
            ) VALUES (
                'Rural Livelihood Design Hackathon 2026 Registration', 
                199.00, 
                'Events', 
                '/f75068b6-ef82-446b-9bf7-998f3b9e32a3.png', 
                'rural-livelihood-hackathon-2026', 
                'events', 
                'Registration for the Rural Livelihood Design Hackathon 2026', 
                'Design the Next Livelihood. India''s Sustainable Livelihood Design Challenge.', 
                true, 
                true
            ) ON CONFLICT (slug) DO NOTHING RETURNING id;
        `);
        if (res.rows.length > 0) {
            console.log('Product created with ID:', res.rows[0].id);
        } else {
            console.log('Product already exists.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}
run();
