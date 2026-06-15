const db = require('../db');

// 1. Health Scoring Engine
const calculateHealthScore = (account) => {
  let score = 100;

  // support tickets penalty: -8 per ticket, max penalty of -40
  const tickets = Number(account.support_tickets_count || 0);
  const ticketPenalty = Math.min(tickets * 8, 40);
  score -= ticketPenalty;

  // NPS Penalty/Bonus
  if (account.nps_score !== null && account.nps_score !== undefined) {
    const nps = Number(account.nps_score);
    if (nps <= 6) {
      score -= 15;
    } else if (nps >= 9) {
      score += 5;
    }
  }

  // Usage Rate Penalty: if usage < 60, subtract (100 - usage) * 0.5
  const usage = Number(account.usage_rate !== undefined ? account.usage_rate : 100);
  if (usage < 60) {
    const usagePenalty = (100 - usage) * 0.5;
    score -= usagePenalty;
  }

  // Recency Penalty: if last activity older than 30 days, subtract 20
  if (account.last_activity_date) {
    const lastActive = new Date(account.last_activity_date);
    const daysSinceActive = (new Date() - lastActive) / (1000 * 60 * 60 * 24);
    if (daysSinceActive > 30) {
      score -= 20;
    }
  }

  // Bound score between 0 and 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  let healthStatus = 'Healthy';
  if (score < 50) {
    healthStatus = 'Critical';
  } else if (score < 80) {
    healthStatus = 'At Risk';
  }

  return {
    score,
    healthStatus,
    churnProbability: 100 - score
  };
};

// Helper to log health trend change
const logHealthHistory = async (accountId, score) => {
  await db.query(
    `INSERT INTO public.account_health_history (account_id, score) VALUES ($1, $2)`,
    [accountId, score]
  ).catch(err => console.error('[CS Service] Failed to log health history:', err.message));
};

// 2. Update Account Metrics & Recalculate Health
const updateAccountMetrics = async (accountId, fields) => {
  // Fetch current account
  const { rows } = await db.query('SELECT * FROM public.customer_accounts WHERE id = $1', [accountId]);
  if (rows.length === 0) {
    throw new Error('Customer account not found');
  }

  const current = rows[0];

  // Merge updates
  const merged = {
    ...current,
    ...fields,
    // Ensure numbers are properly parsed
    support_tickets_count: fields.support_tickets_count !== undefined ? fields.support_tickets_count : current.support_tickets_count,
    nps_score: fields.nps_score !== undefined ? fields.nps_score : current.nps_score,
    usage_rate: fields.usage_rate !== undefined ? fields.usage_rate : current.usage_rate,
    last_activity_date: fields.last_activity_date !== undefined ? fields.last_activity_date : current.last_activity_date
  };

  // Recalculate
  const health = calculateHealthScore(merged);

  // Calculate Health Velocity
  let healthVelocity = 0.0;
  if (current.health_score !== null && current.health_score !== undefined) {
    healthVelocity = health.score - current.health_score;
  }
  
  let healthTrend = 'Stable';
  if (healthVelocity <= -5) healthTrend = 'Down';
  else if (healthVelocity >= 5) healthTrend = 'Up';

  // Check if risk change was detected
  let riskChangeDetectedAt = current.risk_change_detected_at;
  if (healthVelocity <= -10 || (healthTrend === 'Down' && current.health_trend !== 'Down')) {
    riskChangeDetectedAt = new Date().toISOString();
  }

  // Update in DB
  const updateQuery = `
    UPDATE public.customer_accounts
    SET 
      support_tickets_count = $2,
      nps_score = $3,
      usage_rate = $4,
      last_activity_date = $5,
      health_score = $6,
      health_status = $7,
      churn_probability = $8,
      status = $9,
      mrr = $10,
      arr = $11,
      support_integration_source = $12,
      external_support_metadata = $13,
      health_velocity = $14,
      health_trend = $15,
      risk_change_detected_at = $16,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const updatedRes = await db.query(updateQuery, [
    accountId,
    merged.support_tickets_count,
    merged.nps_score,
    merged.usage_rate,
    merged.last_activity_date,
    health.score,
    health.healthStatus,
    health.churnProbability,
    merged.status,
    merged.mrr,
    merged.arr,
    merged.support_integration_source || null,
    JSON.stringify(merged.external_support_metadata || {}),
    healthVelocity,
    healthTrend,
    riskChangeDetectedAt
  ]);

  // Log history if health score changed
  if (current.health_score !== health.score) {
    await logHealthHistory(accountId, health.score);
  }

  return updatedRes.rows[0];
};

// 3. CS Dashboard Executive Analytics
const getCSDashboardStats = async (req) => {
  // Fetch all accounts
  const { rows: accounts } = await db.query('SELECT * FROM public.customer_accounts');
  
  // Fetch expansion (won upsells)
  const { rows: upsells } = await db.query(`
    SELECT COALESCE(SUM(estimated_value), 0)::float as won_upsells
    FROM public.upsell_opportunities
    WHERE status = 'Won'
  `);
  
  const expansionRev = upsells[0]?.won_upsells || 0;

  // Aggregate stats
  let totalARR = 0;
  let totalMRR = 0;
  let churnedARR = 0;
  let npsSum = 0;
  let npsCount = 0;

  let healthyCount = 0;
  let atRiskCount = 0;
  let criticalCount = 0;

  let onboardingCount = 0;
  let activeCount = 0;
  let staleCount = 0;
  let churnedCount = 0;

  const watchlist = [];

  accounts.forEach(acc => {
    const arrVal = Number(acc.arr || 0);
    const mrrVal = Number(acc.mrr || 0);

    if (acc.status === 'Churned') {
      churnedARR += arrVal;
      churnedCount++;
    } else {
      totalARR += arrVal;
      totalMRR += mrrVal;

      if (acc.status === 'Onboarding') onboardingCount++;
      else if (acc.status === 'Active') activeCount++;
      else if (acc.status === 'Stale') staleCount++;
    }

    // Health breakdowns
    if (acc.health_status === 'Healthy') healthyCount++;
    else if (acc.health_status === 'At Risk') atRiskCount++;
    else if (acc.health_status === 'Critical') criticalCount++;

    // NPS
    if (acc.nps_score !== null && acc.nps_score !== undefined) {
      npsSum += Number(acc.nps_score);
      npsCount++;
    }

    // Churn Watchlist criteria: score < 50 OR churn prob > 70% OR no activity in 30+ days
    let daysStale = 0;
    if (acc.last_activity_date) {
      daysStale = (new Date() - new Date(acc.last_activity_date)) / (1000 * 60 * 60 * 24);
    }

    if (acc.health_score < 50 || acc.churn_probability > 70 || daysStale > 30) {
      watchlist.push({
        id: acc.id,
        companyName: acc.company_name,
        contactName: acc.contact_name,
        healthScore: acc.health_score,
        healthStatus: acc.health_status,
        churnProbability: acc.churn_probability,
        lastActivityDate: acc.last_activity_date,
        arr: arrVal,
        status: acc.status
      });
    }
  });

  // Sort watchlist by churn probability descending
  watchlist.sort((a, b) => b.churnProbability - a.churnProbability);

  // Calculate NRR, GRR, Renewal Success Rate
  // Starting ARR = Total ARR + Churned ARR
  const startingARR = totalARR + churnedARR;
  
  // Gross Revenue Retention (GRR)
  const grr = startingARR > 0 ? ((startingARR - churnedARR) / startingARR) * 100 : 100;
  
  // Net Revenue Retention (NRR)
  const nrr = startingARR > 0 ? ((startingARR + expansionRev - churnedARR) / startingARR) * 100 : 100;

  // Renewal Success Rate
  // Due contracts: contracts whose end date has passed, or is within 30 days
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
  
  const dueAccounts = accounts.filter(acc => {
    const end = new Date(acc.contract_end_date);
    return end <= thirtyDaysFromNow;
  });

  const renewedAccounts = dueAccounts.filter(acc => acc.status === 'Active' || acc.status === 'Onboarding');
  const renewalSuccessRate = dueAccounts.length > 0 ? (renewedAccounts.length / dueAccounts.length) * 100 : 100;

  return {
    summary: {
      totalARR,
      totalMRR,
      expansionRevenue: expansionRev,
      churnedRevenue: churnedARR,
      grr: Math.round(grr * 100) / 100,
      nrr: Math.round(nrr * 100) / 100,
      averageNPS: npsCount > 0 ? Math.round((npsSum / npsCount) * 10) / 10 : 0.0,
      renewalSuccessRate: Math.round(renewalSuccessRate * 100) / 100
    },
    distributions: {
      healthBreakdown: {
        healthy: healthyCount,
        atRisk: atRiskCount,
        critical: criticalCount
      },
      statusBreakdown: {
        onboarding: onboardingCount,
        active: activeCount,
        stale: staleCount,
        churned: churnedCount
      }
    },
    watchlist: watchlist.slice(0, 10)
  };
};

// 4. Sweeps upcoming contract renewals (90, 60, 30 days) and alerts CSMs
const sweepRenewalContracts = async () => {
  // Query all customer accounts whose contracts end in approximately 90, 60, or 30 days
  const query = `
    SELECT * 
    FROM public.customer_accounts 
    WHERE status != 'Churned'
  `;
  const { rows: accounts } = await db.query(query);

  let alertsCreated = 0;
  const now = new Date();

  for (const acc of accounts) {
    const end = new Date(acc.contract_end_date);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let alertThreshold = null;
    if (diffDays === 90) alertThreshold = 90;
    else if (diffDays === 60) alertThreshold = 60;
    else if (diffDays === 30) alertThreshold = 30;
    else if (diffDays < 30 && diffDays > 0 && diffDays % 7 === 0) alertThreshold = diffDays; // weekly warning if under 30 days

    if (alertThreshold !== null) {
      // Log an activity log notification for approaching renewal
      const description = `Contract renewal is approaching for ${acc.company_name} (${alertThreshold} days remaining). Expiration Date: ${new Date(acc.contract_end_date).toLocaleDateString()}`;
      
      await db.query(`
        INSERT INTO public.lead_activities (lead_id, activity_type, activity_description, metadata)
        VALUES ($1, 'Follow-up Sent', $2, $3)
      `, [
        acc.lead_id,
        description,
        JSON.stringify({
          action: 'RENEWAL_WARNING',
          companyName: acc.company_name,
          daysRemaining: alertThreshold,
          contractEndDate: acc.contract_end_date
        })
      ]).catch(err => console.error('[CS Service] Renewal alert log fail:', err.message));

      alertsCreated++;
    }
  }

  return { alertsCreated };
};

// 5. Unified Customer Activities Timeline
const getAccountTimeline = async (accountId) => {
  // 1. Fetch account details to get lead_id
  const { rows: accRes } = await db.query('SELECT * FROM public.customer_accounts WHERE id = $1', [accountId]);
  if (accRes.length === 0) throw new Error('Customer account not found');
  
  const acc = accRes[0];
  const leadId = acc.lead_id;

  const timeline = [];

  // Account creation event
  timeline.push({
    event_type: 'Account Created',
    description: `Account created for ${acc.company_name} with status ${acc.status}.`,
    timestamp: acc.created_at,
    metadata: { arr: acc.arr, mrr: acc.mrr }
  });

  // Health Score History
  const { rows: history } = await db.query(
    'SELECT * FROM public.account_health_history WHERE account_id = $1 ORDER BY recorded_at ASC',
    [accountId]
  );
  history.forEach(h => {
    timeline.push({
      event_type: 'Health Score Change',
      description: `Health Score updated to ${h.score}.`,
      timestamp: h.recorded_at,
      metadata: { score: h.score }
    });
  });

  // If there's a leadId, gather activities, notes, and tasks
  if (leadId) {
    // 1. Lead Activities
    const { rows: activities } = await db.query(
      'SELECT * FROM public.lead_activities WHERE lead_id = $1 ORDER BY created_at ASC',
      [leadId]
    );
    activities.forEach(act => {
      // Map activity types to timeline events
      let eventName = 'Activity logged';
      if (act.activity_type === 'Email Sent') eventName = 'Email Communication';
      else if (act.activity_type === 'Meeting Scheduled') eventName = 'Meeting Scheduled';
      else if (act.activity_type === 'Note Added') eventName = 'Support Event';
      else if (act.activity_type === 'Proposal Sent') eventName = 'Upsell Activity';

      timeline.push({
        event_type: eventName,
        description: act.activity_description || `${act.activity_type} interaction recorded.`,
        timestamp: act.created_at,
        metadata: act.metadata || {}
      });
    });

    // 2. Lead Notes
    const { rows: notes } = await db.query(
      'SELECT * FROM public.lead_notes WHERE lead_id = $1 ORDER BY created_at ASC',
      [leadId]
    );
    notes.forEach(note => {
      timeline.push({
        event_type: 'NPS Updates',
        description: `Note/NPS detail: ${note.note_content.substring(0, 150)}`,
        timestamp: note.created_at,
        metadata: {}
      });
    });

    // 3. Upsell activities
    const { rows: upsells } = await db.query(
      'SELECT * FROM public.upsell_opportunities WHERE account_id = $1 ORDER BY created_at ASC',
      [accountId]
    );
    upsells.forEach(up => {
      timeline.push({
        event_type: 'Upsell Activity',
        description: `Expansion Opportunity: "${up.title}" status changed to ${up.status} (${Number(up.estimated_value).toLocaleString()} USD).`,
        timestamp: up.updated_at,
        metadata: { value: up.estimated_value, status: up.status }
      });
    });
  }

  // Sort timeline chronologically (latest first)
  timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return timeline;
};

// 4. Retention & Cohort Analytics
const getRetentionAnalytics = async () => {
  try {
    const { rows: accounts } = await db.query('SELECT * FROM public.customer_accounts');
    
    // Total accounts vs Churned
    const totalAccounts = accounts.length;
    const churnedAccounts = accounts.filter(a => a.status === 'Churned').length;
    const activeAccounts = totalAccounts - churnedAccounts;
    
    const logoRetention = totalAccounts > 0 ? ((activeAccounts / totalAccounts) * 100).toFixed(1) : 100;
    
    const { rows: ttvRows } = await db.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (achieved_at - a.created_at))/86400) as avg_ttv_days
      FROM public.customer_journey_events j
      JOIN public.customer_accounts a ON j.account_id = a.id
      WHERE j.milestone_name = 'Active Adoption'
    `);
    const timeToValueDays = ttvRows.length > 0 && ttvRows[0].avg_ttv_days ? Math.round(ttvRows[0].avg_ttv_days) : 14;

    const summary = {
      logoRetention: Number(logoRetention),
      timeToValueDays,
      activeAccounts,
      churnedAccounts
    };

    const cohorts = accounts.reduce((acc, curr) => {
      const month = new Date(curr.created_at).toISOString().slice(0, 7);
      if (!acc[month]) acc[month] = { cohort: month, size: 0, retained: 0, churned: 0 };
      acc[month].size += 1;
      if (curr.status === 'Churned') acc[month].churned += 1;
      else acc[month].retained += 1;
      return acc;
    }, {});

    const cohortList = Object.values(cohorts).sort((a, b) => b.cohort.localeCompare(a.cohort));
    cohortList.forEach(c => {
      c.retentionRate = c.size > 0 ? Math.round((c.retained / c.size) * 100) : 0;
    });

    return { success: true, data: { summary, cohorts: cohortList } };
  } catch (error) {
     console.error('[CS Service] Error generating retention stats:', error);
     throw error;
  }
};

module.exports = {
  calculateHealthScore,
  updateAccountMetrics,
  getCSDashboardStats,
  getRetentionAnalytics,
  sweepRenewalContracts,
  getAccountTimeline
};
