const db = require('../db');
const { sendEmail } = require('../utils/mailer');
const leadService = require('./leadService');

const emailTemplates = {
  'New Lead': {
    subject: 'Welcome to Kottravai - Your Partner in Sustainable Corporate Gifting',
    body: (name) => `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #8E2A8B;">Welcome to Kottravai, ${name || 'Valued Partner'}!</h2>
        <p>Thank you for expressing interest in our sustainable and artisan-crafted corporate gifting solutions.</p>
        <p>We’ve received your inquiry and our team is currently reviewing your requirements. We specialize in curating premium, eco-friendly gifts that align with corporate social responsibility goals.</p>
        <p>Would you be open to a brief 10-minute introductory call this week to discuss how we can customize a gifting experience for your organization?</p>
        <p><a href="https://calendly.com/kottravai/intro" style="background-color: #2D1B4E; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Schedule a Call</a></p>
        <p>Best regards,<br>The Kottravai Sales Team</p>
      </div>
    `
  },
  'Qualified': {
    subject: 'Next Steps with Kottravai - Let\'s Build Your Custom Gift Box',
    body: (name) => `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #8E2A8B;">Hi ${name || 'there'},</h2>
        <p>It was great connecting with you recently! We're excited about the possibility of partnering with your organization.</p>
        <p>Based on our understanding of your needs, we would like to present a customized proposal that highlights the best of our authentic, handmade products from Tamil Nadu.</p>
        <p>Please let us know if there are any specific products (e.g., Palm Leaf crafts, Banana Fiber, Brassware) you want us to emphasize in the proposal.</p>
        <p>We look forward to hearing from you soon.</p>
        <p>Warm regards,<br>The Kottravai Sales Team</p>
      </div>
    `
  },
  'Proposal Sent': {
    subject: 'Following up on your Kottravai Proposal',
    body: (name) => `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #8E2A8B;">Hi ${name || 'there'},</h2>
        <p>I hope this email finds you well.</p>
        <p>I’m writing to follow up on the proposal we shared with you recently. We’ve poured our dedication into curating options that we believe perfectly match your brand's ethos.</p>
        <p>Have you had a chance to review the proposal with your team? I'd be happy to jump on a quick call to answer any questions or refine the options.</p>
        <p>Looking forward to your feedback.</p>
        <p>Best regards,<br>The Kottravai Sales Team</p>
      </div>
    `
  }
};

const runEmailNurturing = async () => {
  console.log('[NURTURING_JOB] Starting automated email nurturing scan...');
  try {
    const { rows: leads } = await db.query(
      `SELECT * FROM leads 
       WHERE status != 'resolved' 
       AND sales_stage IN ('New Lead', 'Qualified', 'Proposal Sent') 
       AND email IS NOT NULL 
       AND next_followup_at IS NOT NULL 
       AND next_followup_at <= NOW()`
    );

    if (!leads || leads.length === 0) {
      console.log('[NURTURING_JOB] No leads require follow-up at this time.');
      return { success: true, processed: 0 };
    }

    console.log(`[NURTURING_JOB] Found ${leads.length} leads requiring follow-up.`);
    let processed = 0;

    for (const lead of leads) {
      const template = emailTemplates[lead.sales_stage];
      if (!template) continue;

      // Send the email
      const emailHtml = template.body(lead.name);
      await sendEmail({
        to: lead.email,
        subject: template.subject,
        html: emailHtml
      });

      // Log the activity
      await db.query(
        `INSERT INTO lead_activities (lead_id, activity_type, activity_description, metadata, created_at)
         VALUES ($1, 'email', $2, $3::jsonb, NOW())`,
        [lead.id, `Automated nurturing email sent: ${template.subject}`, JSON.stringify({ automated: true, stage: lead.sales_stage })]
      );

      // Update next follow-up to 3 days from now
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 3);
      
      await db.query(
        `UPDATE leads SET next_followup_at = $1, updated_at = NOW() WHERE id = $2`,
        [nextDate.toISOString(), lead.id]
      );

      processed++;
    }

    console.log(`[NURTURING_JOB] Successfully nurtured ${processed} leads.`);
    return { success: true, processed };
  } catch (err) {
    console.error('[NURTURING_JOB] Error running nurturing job:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  runEmailNurturing
};
