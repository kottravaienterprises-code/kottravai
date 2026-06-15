const { createClient } = require('@supabase/supabase-js');
const db = require('../db'); // For complex queries
const leadService = require('./leadService');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

class EscalationService {
  /**
   * Main entry point triggered by cron.
   */
  async runDailySweep() {
    console.log('[EscalationService] Starting automation sweep...');
    const results = {
      missedFollowUps: 0,
      escalatedToHigh: 0,
      escalatedToCritical: 0,
      revopsSlaBreaches: 0,
      errors: 0
    };

    try {
      // 1. Process Missed Follow-ups
      const missed = await this.processMissedFollowUps();
      results.missedFollowUps = missed.count;

      // 2. Process 7-Day Inactivity (Critical)
      const critical = await this.processInactivity(7, 'critical');
      results.escalatedToCritical = critical.count;

      // 3. Process 3-Day Inactivity (High)
      const high = await this.processInactivity(3, 'high');
      results.escalatedToHigh = high.count;

      // 4. Process RevOps SLAs
      try {
        const revopsService = require('./revopsService');
        const slaResults = await revopsService.checkStageSLAs();
        results.revopsSlaBreaches = slaResults.results?.flaggedOverdue || 0;
        results.errors += slaResults.results?.errors || 0;
      } catch (revopsErr) {
        console.error('[EscalationService] RevOps SLA sweep failed:', revopsErr);
        results.errors++;
      }

      console.log('[EscalationService] Sweep completed successfully:', results);
      return { success: true, results };
    } catch (err) {
      console.error('[EscalationService] Sweep failed:', err);
      return { success: false, error: err.message, results };
    }
  }

  /**
   * Rule: next_followup_at < NOW() AND status active.
   * Prevent duplicates by checking if the last activity was already 'Follow-up Missed'.
   */
  async processMissedFollowUps() {
    let count = 0;
    
    // Find active leads with missed follow-ups
    const query = `
      SELECT l.id, l.priority, l.next_followup_at,
             (SELECT activity_type FROM public.lead_activities a 
              WHERE a.lead_id = l.id ORDER BY a.created_at DESC LIMIT 1) as last_activity
      FROM public.leads l
      WHERE l.next_followup_at < NOW()
        AND l.status NOT IN ('won', 'lost', 'archived', 'completed')
    `;
    
    const { rows: leads } = await db.query(query);

    for (const lead of leads) {
      // Avoid duplicate: if the very last thing logged was Follow-up Missed, skip it.
      if (lead.last_activity === 'Follow-up Missed') continue;

      try {
        const updates = {};
        
        // Only elevate priority to high if it's lower
        if (lead.priority === 'low' || lead.priority === 'medium') {
          updates.priority = 'high';
        }
        
        // We do NOT clear next_followup_at so the rep still sees it overdue.
        
        if (Object.keys(updates).length > 0) {
          await supabase.from('leads').update(updates).eq('id', lead.id);
        }

        // Log the missed follow-up event
        await leadService.logActivity(lead.id, 'Follow-up Missed', `Missed scheduled follow-up for ${lead.next_followup_at}`);
        count++;
      } catch (err) {
        console.error(`[EscalationService] Failed to process missed follow-up for lead ${lead.id}:`, err);
      }
    }
    return { count };
  }

  /**
   * Rule: last_contacted_at (or created_at) < X days ago AND status active.
   * Prevent duplicates by only updating if priority ACTUALLY changes.
   */
  async processInactivity(days, targetPriority) {
    let count = 0;
    
    const query = `
      SELECT id, priority, status
      FROM public.leads
      WHERE COALESCE(last_contacted_at, created_at) < NOW() - INTERVAL '${days} days'
        AND status NOT IN ('won', 'lost', 'archived', 'completed')
        AND priority != $1
    `;
    
    // Target priority is critical (for 7 days) or high (for 3 days)
    // By doing priority != $1, we ensure we only select leads that actually need a change, preventing duplicate events.
    // However, if target is 'high', we don't want to downgrade a 'critical' lead to 'high'.
    const { rows: leads } = await db.query(query, [targetPriority]);

    for (const lead of leads) {
      // Skip downgrading critical -> high
      if (targetPriority === 'high' && lead.priority === 'critical') continue;

      try {
        await supabase.from('leads').update({ priority: targetPriority }).eq('id', lead.id);
        await leadService.logActivity(
          lead.id, 
          'Lead Escalated', 
          `Lead escalated to ${targetPriority} priority due to ${days}+ days of inactivity.`
        );
        count++;
      } catch (err) {
         console.error(`[EscalationService] Failed to process inactivity for lead ${lead.id}:`, err);
      }
    }
    return { count };
  }
}

module.exports = new EscalationService();
