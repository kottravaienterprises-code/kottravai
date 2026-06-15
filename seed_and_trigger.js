require('dotenv').config({ path: 'server/.env' });
const axios = require('axios');
const db = require('./server/db');

async function test() {
  try {
    // 1. Seed a test lead
    const query = `
      INSERT INTO public.leads (id, name, email, status, priority, last_contacted_at, next_followup_at)
      VALUES (gen_random_uuid(), 'Automation Test Lead', 'autotest@example.com', 'new', 'low', NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days')
      RETURNING id;
    `;
    const { rows } = await db.query(query);
    const leadId = rows[0].id;
    console.log('Seeded test lead:', leadId);

    // 2. Trigger the cron endpoint
    const adminPass = process.env.VITE_ADMIN_PASSWORD || 'Admin!Kottravai2025%100';
    console.log('Triggering run-escalations...');
    const res = await axios.post('http://localhost:5000/api/admin/automation/run-escalations', {}, {
      headers: { 'x-cron-secret': adminPass }
    });
    console.log('Escalation Results:', res.data);

    // 3. Verify lead_activities
    const activitiesQuery = `
      SELECT activity_type, activity_description 
      FROM public.lead_activities 
      WHERE lead_id = $1 
      ORDER BY created_at ASC;
    `;
    const activities = await db.query(activitiesQuery, [leadId]);
    console.log('Lead Activities for Test Lead:');
    console.dir(activities.rows, { depth: null });

    // 4. Verify priority
    const leadQuery = `SELECT priority FROM public.leads WHERE id = $1;`;
    const leadRes = await db.query(leadQuery, [leadId]);
    console.log('Final Lead Priority:', leadRes.rows[0].priority);

  } catch(e) {
    console.error('Error:', e.response?.data || e.message);
  }
}

test();
