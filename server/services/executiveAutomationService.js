const cron = require('node-cron');
const db = require('../db');
const { sendEmail } = require('../utils/mailer');
const revIntel = require('./revenueIntelligenceService');
const forecastSvc = require('./revenueForecastService');
const boardSvc = require('./boardReportingService');
const copilotSvc = require('./revenueCopilotService');

const scheduleJobs = new Map();

const ensureTables = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.executive_report_schedules (
      id SERIAL PRIMARY KEY,
      frequency TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      recipient TEXT,
      timezone TEXT DEFAULT 'UTC',
      enabled BOOLEAN DEFAULT TRUE,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS public.executive_reports (
      id SERIAL PRIMARY KEY,
      schedule_id INTEGER,
      frequency TEXT NOT NULL,
      board_pack JSONB DEFAULT '{}'::jsonb,
      digest JSONB DEFAULT '{}'::jsonb,
      alerts JSONB DEFAULT '[]'::jsonb,
      status TEXT DEFAULT 'generated',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS public.executive_feed_events (
      id SERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      severity TEXT DEFAULT 'Medium',
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS public.executive_alerts (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      recommended_action TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
};

const getScheduleExpression = (frequency) => {
  const map = {
    daily: '0 8 * * *',
    weekly: '0 8 * * 1',
    monthly: '0 8 1 * *',
    quarterly: '0 8 1 1,4,7,10 *'
  };
  return map[frequency] || map.daily;
};

const normalizeFrequency = (value) => {
  const normalized = String(value || '').toLowerCase();
  return ['daily', 'weekly', 'monthly', 'quarterly'].includes(normalized) ? normalized : 'daily';
};

const logAudit = async (req, action, metadata = {}) => {
  try {
    const adminId = req?.adminUser?.id || req?.adminUser?.username || 'system';
    const adminRole = req?.adminRole || 'SYSTEM';
    await db.query(
      `INSERT INTO public.admin_audit_logs (admin_id, action, resource_type, resource_id, metadata, ip_address, admin_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [adminId, action, 'EXECUTIVE_AUTOMATION', 'global', JSON.stringify({ ...metadata, generatedBy: adminId }), req?.ip || '127.0.0.1', adminRole]
    );
  } catch (error) {
    console.warn('[Executive Automation] Audit log skipped:', error.message);
  }
};

const createFeedEvent = async ({ eventType, title, summary, severity = 'Medium', metadata = {} }) => {
  await ensureTables();
  await db.query(
    `INSERT INTO public.executive_feed_events (event_type, title, summary, severity, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [eventType, title, summary, severity, JSON.stringify(metadata)]
  );
};

const createAlertRecord = async (alert) => {
  await ensureTables();
  await db.query(
    `INSERT INTO public.executive_alerts (category, severity, message, recommended_action, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [alert.category, alert.severity, alert.message, alert.recommendedAction, JSON.stringify(alert)]
  );
};

const evaluateAlertRules = ({ overview = {}, forecast = {}, risks = {} }) => {
  const alerts = [];
  const pipelineCoverage = (overview.weightedPipeline || 0) / Math.max(overview.currentARR || 0, 1);
  const renewalProbability = overview.renewalProbability ?? overview.renewalSuccessRate ?? 0;

  const pushAlert = (category, severity, message, recommendedAction) => {
    alerts.push({ severity, category, message, recommendedAction });
  };

  if (forecast.forecastAccuracy !== undefined && Number(forecast.forecastAccuracy) < 85) {
    const severity = Number(forecast.forecastAccuracy) < 70 ? 'Critical' : 'High';
    pushAlert(
      'Forecast Accuracy',
      severity,
      `Forecast accuracy fell to ${forecast.forecastAccuracy}% versus the 85% minimum threshold.`,
      'Review forecast assumptions and update the revenue model with fresh pipeline input.'
    );
  }

  if ((overview.nrr ?? 0) < 100) {
    const severity = (overview.nrr ?? 0) < 90 ? 'Critical' : 'High';
    pushAlert(
      'NRR',
      severity,
      `NRR is ${overview.nrr}% versus the 100% target.`,
      'Prioritize retention interventions and expansion plays for at-risk accounts.'
    );
  }

  if (pipelineCoverage < 3) {
    const severity = pipelineCoverage < 2 ? 'High' : 'Medium';
    pushAlert(
      'Pipeline Coverage',
      severity,
      `Pipeline coverage is ${pipelineCoverage.toFixed(2)}x versus the 3x target.`,
      'Increase qualified pipeline generation and accelerate late-stage deals.'
    );
  }

  if (Number(renewalProbability) < 50) {
    pushAlert(
      'Renewal Probability',
      'Medium',
      `Renewal probability is ${renewalProbability}% versus the 50% benchmark.`,
      'Re-engage renewals early with account-level success plans.'
    );
  }

  if ((risks.criticalAccounts ?? overview.criticalAccounts ?? 0) > 10) {
    pushAlert(
      'Critical Accounts',
      'Critical',
      `${risks.criticalAccounts ?? overview.criticalAccounts ?? 0} critical accounts require executive review.`,
      'Escalate these accounts to the executive team and assign recovery owners.'
    );
  }

  if ((overview.arrGrowth ?? 0) < 0) {
    pushAlert(
      'ARR Growth',
      'High',
      `ARR growth is ${overview.arrGrowth}% which is below zero.`,
      'Focus on expansion motions and renewal recovery to restore growth.'
    );
  }

  return alerts;
};

const getWatchlists = ({ overview = {}, forecast = {}, risks = {} }) => {
  const watchlists = [
    {
      metric: 'NRR',
      operator: '<',
      threshold: 100,
      severity: 'High',
      owner: 'Revenue Ops',
      status: (overview.nrr ?? 0) < 100 ? 'Triggered' : 'Healthy'
    },
    {
      metric: 'Forecast Accuracy',
      operator: '<',
      threshold: 85,
      severity: 'Medium',
      owner: 'Finance',
      status: (forecast.forecastAccuracy ?? 100) < 85 ? 'Triggered' : 'Healthy'
    },
    {
      metric: 'Pipeline Coverage',
      operator: '<',
      threshold: 3,
      severity: 'Medium',
      owner: 'Sales Ops',
      status: (((overview.weightedPipeline || 0) / Math.max(overview.currentARR || 0, 1)) < 3) ? 'Triggered' : 'Healthy'
    },
    {
      metric: 'Critical Health Accounts',
      operator: '>',
      threshold: 10,
      severity: 'Critical',
      owner: 'CS Leadership',
      status: ((risks.criticalAccounts ?? overview.criticalAccounts ?? 0) > 10) ? 'Triggered' : 'Healthy'
    }
  ];

  return watchlists;
};

const buildDigest = ({ overview = {}, forecast = {}, risks = {}, opportunities = {}, boardPack = {} }) => {
  const sections = [
    {
      title: 'Executive Summary',
      body: `Current ARR is ${overview.currentARR?.toLocaleString?.() || overview.currentARR || 0} with NRR at ${overview.nrr ?? 0}% and a ${forecast.confidence?.rating || 'Medium'} confidence forecast.`
    },
    {
      title: 'Revenue Performance',
      body: `Revenue performance is tracking with ${overview.nrr ?? 0}% NRR and ${overview.grr ?? 0}% GRR while ARR growth sits at ${overview.arrGrowth ?? 0}%.`
    },
    {
      title: 'Forecast Outlook',
      body: `The unified forecast is ${forecast.totalForecast?.toLocaleString?.() || forecast.totalForecast || 0} with ${forecast.forecastAccuracy ?? 0}% forecast accuracy and ${forecast.confidence?.score ?? 0}/100 confidence.`
    },
    {
      title: 'Top Opportunities',
      body: `Expansion pipeline totals ${opportunities.totalExpansionPipeline?.toLocaleString?.() || opportunities.totalExpansionPipeline || 0} across ${opportunities.upsellOpportunities?.length || 0} open opportunities.`
    },
    {
      title: 'Top Risks',
      body: `Primary risks include ${risks.riskLevel || 'Low'} risk posture and ${risks.atRiskARR?.toLocaleString?.() || risks.atRiskARR || 0} ARR at risk.`
    },
    {
      title: 'Recommended Actions',
      body: 'Prioritize retention recovery, accelerate renewal plans, and focus executive attention on high-value accounts.'
    },
    {
      title: 'Board Highlights',
      body: (boardPack.boardHighlights || []).join(' | ') || 'Board metrics remain stable and require continued monitoring.'
    }
  ];

  return {
    generatedAt: new Date().toISOString(),
    sections
  };
};

const getContext = async (req, frequency = 'quarterly') => {
  const [overview, forecast, risks, opportunities, boardPack] = await Promise.all([
    revIntel.getRevenueOverview(req),
    forecastSvc.getForecast(frequency),
    revIntel.getRevenueRisks(req),
    revIntel.getGrowthOpportunities(req),
    boardSvc.generateBoardPack(frequency, req)
  ]);

  return { overview, forecast, risks, opportunities, boardPack };
};

const runExecutiveReport = async ({ req, frequency = 'quarterly', recipient = null, scheduleId = null }) => {
  await ensureTables();
  const normalizedFrequency = normalizeFrequency(frequency);
  const context = await getContext(req, normalizedFrequency);
  const digest = buildDigest(context);
  const alerts = evaluateAlertRules(context);
  const boardPack = context.boardPack;

  await revIntel.saveRevenueSnapshot({
    arr: context.overview.currentARR,
    mrr: context.overview.currentMRR,
    nrr: context.overview.nrr,
    grr: context.overview.grr,
    pipelineForecast: context.forecast.pipelineForecast,
    renewalForecast: context.forecast.renewalForecast,
    expansionForecast: context.forecast.expansionForecast,
    expectedChurn: context.forecast.expectedChurn,
    unifiedForecast: context.forecast.totalForecast
  });

  for (const alert of alerts) {
    await createAlertRecord(alert);
  }

  await createFeedEvent({
    eventType: 'Executive Report',
    title: `${normalizedFrequency[0].toUpperCase()}${normalizedFrequency.slice(1)} Executive Report Generated`,
    summary: `Board pack, revenue snapshot, and executive digest were generated for ${normalizedFrequency} reporting.`,
    severity: alerts.some((alert) => alert.severity === 'Critical') ? 'Critical' : 'Medium',
    metadata: { frequency: normalizedFrequency, boardPack: boardPack.overview }
  });

  const reportRecord = await db.query(
    `INSERT INTO public.executive_reports (schedule_id, frequency, board_pack, digest, alerts, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [scheduleId, normalizedFrequency, JSON.stringify(boardPack), JSON.stringify(digest), JSON.stringify(alerts), 'generated']
  );

  await logAudit(req, 'EXECUTIVE_REPORT_GENERATED', { frequency: normalizedFrequency, reportId: reportRecord.rows[0]?.id, alerts: alerts.length });

  let emailResult = { success: false, skipped: true, reason: 'No recipient configured' };
  if (recipient) {
    try {
      const html = `
        <h2>Executive Automation Report</h2>
        <p>Frequency: ${normalizedFrequency}</p>
        <pre>${JSON.stringify({ digest, alerts, boardPack }, null, 2)}</pre>
      `;
      emailResult = await sendEmail({ to: recipient, subject: `Kottravai Executive ${normalizedFrequency} Report`, html, type: 'custom' });
    } catch (error) {
      emailResult = { success: false, error: error.message };
    }
  }

  await logAudit(req, 'EXECUTIVE_REPORT_SENT', { frequency: normalizedFrequency, reportId: reportRecord.rows[0]?.id, emailSent: emailResult.success });

  return {
    success: true,
    reportId: reportRecord.rows[0]?.id,
    frequency: normalizedFrequency,
    boardPack,
    digest,
    alerts,
    emailResult
  };
};

const createSchedule = async ({ frequency, recipient, timezone = 'UTC', enabled = true, req = null }) => {
  await ensureTables();
  const normalizedFrequency = normalizeFrequency(frequency);
  const cronExpression = getScheduleExpression(normalizedFrequency);
  const result = await db.query(
    `INSERT INTO public.executive_report_schedules (frequency, cron_expression, recipient, timezone, enabled, metadata)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, frequency, cron_expression, recipient, timezone, enabled`,
    [normalizedFrequency, cronExpression, recipient || null, timezone, enabled, JSON.stringify({ createdBy: req?.adminUser?.username || 'system' })]
  );

  const schedule = result.rows[0];
  if (enabled) {
    const job = cron.schedule(cronExpression, () => {
      runExecutiveReport({ req, frequency: schedule.frequency, recipient: schedule.recipient, scheduleId: schedule.id });
    }, { timezone });
    scheduleJobs.set(schedule.id, job);
  }

  return schedule;
};

const listSchedules = async () => {
  await ensureTables();
  const { rows } = await db.query(`SELECT * FROM public.executive_report_schedules ORDER BY created_at DESC`);
  return rows;
};

const getFeedEvents = async (limit = 20) => {
  await ensureTables();
  const { rows } = await db.query(
    `SELECT * FROM public.executive_feed_events ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
};

const getAlerts = async (limit = 20) => {
  await ensureTables();
  const { rows } = await db.query(
    `SELECT * FROM public.executive_alerts ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
};

const getExecutiveCommandCenter = async (req) => {
  const [overview, forecast, risks, opportunities, alerts, watchlists, digest, feed, schedules] = await Promise.all([
    revIntel.getRevenueOverview(req),
    forecastSvc.getForecast('quarterly'),
    revIntel.getRevenueRisks(req),
    revIntel.getGrowthOpportunities(req),
    getAlerts(10),
    Promise.resolve(getWatchlists({ overview, forecast, risks })),
    Promise.resolve(buildDigest({ overview, forecast, risks, opportunities, boardPack: { boardHighlights: [] } })),
    getFeedEvents(10),
    listSchedules()
  ]);

  const enrichedAlerts = alerts.map((alert) => ({
    ...alert,
    severity: alert.severity || 'Medium',
    category: alert.category || 'Revenue'
  }));

  return {
    overview,
    forecast,
    risks,
    opportunities,
    alerts: enrichedAlerts,
    watchlists,
    digest,
    feed,
    schedules,
    scope: {
      role: req?.adminRole || 'SUPER_ADMIN',
      team: req?.adminUser?.team || null
    }
  };
};

module.exports = {
  ensureTables,
  evaluateAlertRules,
  getWatchlists,
  buildDigest,
  runExecutiveReport,
  createSchedule,
  listSchedules,
  getFeedEvents,
  getAlerts,
  getExecutiveCommandCenter,
  createFeedEvent,
  logAudit
};
