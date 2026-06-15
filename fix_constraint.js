require('dotenv').config({ path: 'server/.env' });
const db = require('./server/db');

async function applyDB() {
  const query = `
    CREATE INDEX IF NOT EXISTS idx_leads_next_followup_at ON public.leads(next_followup_at);
    CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(priority);
    CREATE INDEX IF NOT EXISTS idx_leads_last_contacted_at ON public.leads(last_contacted_at);

    ALTER TABLE public.lead_activities DROP CONSTRAINT IF EXISTS lead_activities_type_check;
    ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_type_check CHECK (activity_type IN (
      'Email Sent', 'Email Opened', 'Link Clicked', 'Meeting Scheduled', 
      'Proposal Sent', 'Follow-up Sent', 'Task Created', 'Status Changed', 
      'Note Added', 'Lead Captured', 'AI Qualification Completed', 
      'AI Qualification Fallback', 'Assignment Changed', 'Follow-up Scheduled', 
      'Follow-up Completed', 'Follow-up Missed', 'Lead Escalated', 'Lead Reassigned'
    ));
  `;
  try {
    await db.query(query);
    console.log('Successfully applied DB changes for Phase 3A');
  } catch(e) {
    console.error('Error:', e);
  }
}
applyDB();
