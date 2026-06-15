const { createClient } = require('@supabase/supabase-js');
const aiLeadQualificationService = require('./aiLeadQualificationService');

// Initialize Supabase Client (assuming env variables are injected)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

class LeadService {
  /**
   * Centralized private method for consistent audit trails.
   */
  async logActivity(leadId, type, description, performedBy = null) {
    if (!leadId || !type) return { error: 'Missing required fields for activity log' };
    
    const validTypes = [
      'Lead Captured', 'AI Qualification Completed', 'AI Qualification Fallback',
      'Status Changed', 'Assignment Changed', 'Follow-up Scheduled',
      'Follow-up Completed', 'Note Added', 'Lead Escalated', 'Lead Reassigned'
    ];

    if (!validTypes.includes(type)) {
      console.warn(`[LeadService] Invalid activity type provided: ${type}`);
    }

    try {
      const { data, error } = await supabase.from('lead_activities').insert([{
        lead_id: leadId,
        activity_type: type,
        activity_description: description,
        performed_by: performedBy
      }]).select().single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('[LeadService] Error logging activity:', err.message);
      return { error: err.message };
    }
  }

  /**
   * Inserts a new lead, logs "Lead Captured", and triggers AI qualification.
   */
  async createLead(payload, user = null) {
    try {
      // 1. Insert Lead
      const { data: lead, error: insertErr } = await supabase
        .from('leads')
        .insert([payload])
        .select()
        .single();

      if (insertErr) throw new Error('Lead creation failed: ' + insertErr.message);

      // 2. Log Activity
      const performerId = user?.id || null;
      await this.logActivity(lead.id, 'Lead Captured', `Lead submitted via ${payload.source || 'unknown source'}`, performerId);

      // 3. Trigger AI Qualification asynchronously (or synchronously depending on flow)
      // Since some endpoints await it, we will await it here.
      await this.qualifyLead(lead.id, lead, performerId);

      // 4. Fetch the fully updated lead
      const { data: finalLead } = await supabase.from('leads').select('*').eq('id', lead.id).single();

      return { success: true, data: finalLead || lead };
    } catch (err) {
      console.error('[LeadService] createLead error:', err);
      throw err; // Let controller handle HTTP response
    }
  }

  /**
   * Qualifies the lead via AI and updates DB + logs activity.
   */
  async qualifyLead(id, existingLeadData = null, performerId = null) {
    try {
      let lead = existingLeadData;
      if (!lead) {
        const { data } = await supabase.from('leads').select('*').eq('id', id).single();
        if (!data) throw new Error('Lead not found');
        lead = data;
      }

      const analysis = await aiLeadQualificationService.analyzeLead(lead);

      const updates = {
        ai_summary: analysis.ai_summary,
        // Since ai_reasoning, lead_temperature, qualification_status, ai_next_action aren't in the authoritative schema explicitly except in lead_ai_analysis
        // We will store only what is in the authoritative schema:
        lead_score: analysis.lead_score,
        priority: analysis.priority
      };

      // Also persist to lead_ai_analysis if required, but for now we stick to what was previously updated inline
      const { error: updateErr } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id);

      if (updateErr) throw new Error('Failed to save AI analysis: ' + updateErr.message);

      // Merge results for the return value
      Object.assign(lead, updates);

      // Auto log AI qualification
      const aiMode = analysis?.ai_qualification_mode === 'success' ? 'AI Qualification Completed' : 'AI Qualification Fallback';
      const aiDesc = analysis?.ai_qualification_mode === 'success' 
        ? `Lead scored ${analysis.lead_score}/100. Priority: ${analysis.priority}` 
        : `AI analysis failed, heuristic scoring applied. Score: ${analysis.lead_score}/100`;

      await this.logActivity(id, aiMode, aiDesc, performerId);

      return { success: true, data: lead, analysis };
    } catch (err) {
      console.error('[LeadService] qualifyLead error:', err);
      throw err;
    }
  }

  /**
   * Core CRM update method (status, assignment, generic fields).
   */
    async updateLead(id, updates, oldLeadData = null, performerId = null) {
    try {
      let oldLead = oldLeadData;
      if (!oldLead) {
        const { data } = await supabase.from('leads').select('*').eq('id', id).single();
        oldLead = data || {};
      }

      // Phase 4: Auto-calculate forecast revenue if deal value or probability changes
      if (updates.estimated_deal_value !== undefined || updates.conversion_probability !== undefined) {
        const dealValue = updates.estimated_deal_value !== undefined ? parseFloat(updates.estimated_deal_value) || 0 : parseFloat(oldLead.estimated_deal_value) || 0;
        const prob = updates.conversion_probability !== undefined ? parseInt(updates.conversion_probability, 10) || 0 : parseInt(oldLead.conversion_probability, 10) || 0;
        updates.forecast_revenue = dealValue * (prob / 100.0);
      }

      // Phase 4: Handle closed won/lost timestamps
      if (updates.sales_stage && updates.sales_stage !== oldLead.sales_stage) {
          if (updates.sales_stage === 'Closed Won') {
              updates.closed_won_at = new Date().toISOString();
          } else if (updates.sales_stage === 'Closed Lost') {
              updates.closed_lost_at = new Date().toISOString();
          }
      }

      const { data: updatedLead, error: updateErr } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) throw new Error(updateErr.message);

      // Auto-logging based on deltas
      if (updates.status !== undefined && updates.status !== oldLead.status) {
        await this.logActivity(id, 'Status Changed', `Status changed from ${oldLead.status || 'None'} to ${updates.status}`, performerId);
      }
      
      if (updates.assigned_to !== undefined && updates.assigned_to !== oldLead.assigned_to) {
        await this.logActivity(id, 'Assignment Changed', `Assigned to updated to ${updates.assigned_to || 'unassigned'}`, performerId);
      }

      // Schedule follow up if next_followup_at is included in generic update
      if (updates.next_followup_at !== undefined && updates.next_followup_at !== oldLead.next_followup_at) {
         await this.logActivity(id, 'Follow-up Scheduled', `Follow-up scheduled for ${updates.next_followup_at}`, performerId);
      }

      return { success: true, data: updatedLead };
    } catch (err) {
      console.error('[LeadService] updateLead error:', err);
      throw err;
    }
  }

  /**
   * Dedicated follow-up management for upcoming automation engine.
   */
  async scheduleFollowUp(leadId, followupDate, action = null, performerId = null) {
    try {
      const updates = { next_followup_at: followupDate };
      if (action !== null) updates.next_action = action;

      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity(leadId, 'Follow-up Scheduled', `Follow-up scheduled for ${followupDate}${action ? ` with action: ${action}` : ''}`, performerId);

      return { success: true, data };
    } catch (err) {
      console.error('[LeadService] scheduleFollowUp error:', err);
      throw err;
    }
  }

  /**
   * Appends free-text CRM notes.
   */
  async addNote(id, note, performerId = null) {
    try {
      return await this.logActivity(id, 'Note Added', note, performerId);
    } catch (err) {
      console.error('[LeadService] addNote error:', err);
      throw err;
    }
  }
}

module.exports = new LeadService();
