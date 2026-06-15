require('dotenv').config({ path: 'server/.env' });
const db = require('./server/db');

async function applyPhase3B() {
  const query = `
    ALTER TABLE public.leads
      ADD COLUMN IF NOT EXISTS conversion_probability INTEGER,
      ADD COLUMN IF NOT EXISTS risk_status TEXT,
      ADD COLUMN IF NOT EXISTS copilot_rationale TEXT,
      ADD COLUMN IF NOT EXISTS copilot_last_analyzed_at TIMESTAMPTZ;
  `;
  try {
    await db.query(query);
    console.log('Successfully applied DB changes for Phase 3B');
  } catch(e) {
    console.error('Error:', e);
  }
}
applyPhase3B();
