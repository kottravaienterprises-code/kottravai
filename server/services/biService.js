const db = require('../db');

// Whitelists for Security
const ALLOWED_METRICS = ['count', 'lead_count', 'sum_deal_value', 'avg_deal_value', 'win_rate', 'avg_stage_duration', 'forecast_revenue', 'conversion_rate'];
const ALLOWED_GROUPINGS = ['sales_stage', 'lead_source', 'team', 'assigned_to', 'created_month', 'industry', 'quality'];

// Helper for RBAC Visibility Clause
const getLeadVisibilityClause = (req, params) => {
  if (req.adminRole === 'REPRESENTATIVE') {
    params.push(req.adminUser.id);
    return ` (assigned_to = $${params.length} OR assigned_to IS NULL) `;
  } else if (req.adminRole === 'MANAGER') {
    params.push(req.adminUser.team || 'Domestic');
    return ` (team = $${params.length} OR assigned_to IS NULL) `;
  }
  return ' 1=1 ';
};

// Helper to calculate median
const calculateMedian = (values) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[half];
  }
  return (sorted[half - 1] + sorted[half]) / 2.0;
};

// Helper to benchmark values
const getBenchmarkRating = (value, average) => {
  if (average === 0) return 'Average';
  const ratio = value / average;
  if (ratio > 1.1) return 'Above Average';
  if (ratio < 0.9) return 'Below Average';
  return 'Average';
};

// 1. Cohort Analysis Matrix
const getCohorts = async (req) => {
  const params = [];
  const visibility = getLeadVisibilityClause(req, params);

  const query = `
    WITH cohort_leads AS (
      SELECT 
        id as lead_id,
        DATE_TRUNC('month', created_at) as cohort_month,
        created_at
      FROM public.leads
      WHERE created_at >= NOW() - INTERVAL '12 months'
        AND ${visibility}
    ),
    stage_events AS (
      SELECT 
        h.lead_id,
        h.new_stage,
        EXTRACT(EPOCH FROM (h.changed_at - cl.created_at)) / 86400.0 as days_to_transition
      FROM public.lead_stage_history h
      JOIN cohort_leads cl ON h.lead_id = cl.lead_id
    )
    SELECT 
      TO_CHAR(cl.cohort_month, 'YYYY-MM') as cohort,
      COUNT(DISTINCT cl.lead_id) as cohort_size,
      COUNT(DISTINCT CASE WHEN se.new_stage = 'Qualified' AND se.days_to_transition <= 30 THEN cl.lead_id END) as qualified_m0,
      COUNT(DISTINCT CASE WHEN se.new_stage = 'Qualified' AND se.days_to_transition > 30 AND se.days_to_transition <= 60 THEN cl.lead_id END) as qualified_m1,
      COUNT(DISTINCT CASE WHEN se.new_stage = 'Qualified' AND se.days_to_transition > 60 THEN cl.lead_id END) as qualified_m2,
      
      COUNT(DISTINCT CASE WHEN se.new_stage = 'Proposal Sent' AND se.days_to_transition <= 30 THEN cl.lead_id END) as proposal_m0,
      COUNT(DISTINCT CASE WHEN se.new_stage = 'Proposal Sent' AND se.days_to_transition > 30 AND se.days_to_transition <= 60 THEN cl.lead_id END) as proposal_m1,
      COUNT(DISTINCT CASE WHEN se.new_stage = 'Proposal Sent' AND se.days_to_transition > 60 THEN cl.lead_id END) as proposal_m2,
      
      COUNT(DISTINCT CASE WHEN se.new_stage = 'Closed Won' AND se.days_to_transition <= 30 THEN cl.lead_id END) as won_m0,
      COUNT(DISTINCT CASE WHEN se.new_stage = 'Closed Won' AND se.days_to_transition > 30 AND se.days_to_transition <= 60 THEN cl.lead_id END) as won_m1,
      COUNT(DISTINCT CASE WHEN se.new_stage = 'Closed Won' AND se.days_to_transition > 60 AND se.days_to_transition <= 90 THEN cl.lead_id END) as won_m2,
      COUNT(DISTINCT CASE WHEN se.new_stage = 'Closed Won' AND se.days_to_transition > 90 THEN cl.lead_id END) as won_m3
    FROM cohort_leads cl
    LEFT JOIN stage_events se ON cl.lead_id = se.lead_id
    GROUP BY cl.cohort_month
    ORDER BY cl.cohort_month DESC
  `;

  const res = await db.query(query, params);

  return res.rows.map(r => {
    const size = Number(r.cohort_size || 0);
    return {
      cohort: r.cohort,
      size,
      qualified: {
        m0: size > 0 ? Math.round((Number(r.qualified_m0) / size) * 100) : 0,
        m1: size > 0 ? Math.round((Number(r.qualified_m1) / size) * 100) : 0,
        m2: size > 0 ? Math.round((Number(r.qualified_m2) / size) * 100) : 0,
      },
      proposal: {
        m0: size > 0 ? Math.round((Number(r.proposal_m0) / size) * 100) : 0,
        m1: size > 0 ? Math.round((Number(r.proposal_m1) / size) * 100) : 0,
        m2: size > 0 ? Math.round((Number(r.proposal_m2) / size) * 100) : 0,
      },
      won: {
        m0: size > 0 ? Math.round((Number(r.won_m0) / size) * 100) : 0,
        m1: size > 0 ? Math.round((Number(r.won_m1) / size) * 100) : 0,
        m2: size > 0 ? Math.round((Number(r.won_m2) / size) * 100) : 0,
        m3: size > 0 ? Math.round((Number(r.won_m3) / size) * 100) : 0,
      }
    };
  });
};

// 2. Win / Loss Analytics
const getWinLossAnalysis = async (req) => {
  const params1 = [];
  const vis1 = getLeadVisibilityClause(req, params1);

  // Win Rate by Industry
  const qIndustry = `
    SELECT 
      COALESCE(industry, 'Unknown') as key,
      COUNT(*) FILTER (WHERE sales_stage = 'Closed Won') as won,
      COUNT(*) FILTER (WHERE sales_stage IN ('Closed Won', 'Closed Lost')) as total
    FROM public.leads
    WHERE ${vis1}
    GROUP BY industry
  `;

  // Win Rate by Lead Source
  const params2 = [];
  const vis2 = getLeadVisibilityClause(req, params2);
  const qSource = `
    SELECT 
      COALESCE(source, 'Unknown') as key,
      COUNT(*) FILTER (WHERE sales_stage = 'Closed Won') as won,
      COUNT(*) FILTER (WHERE sales_stage IN ('Closed Won', 'Closed Lost')) as total
    FROM public.leads
    WHERE ${vis2}
    GROUP BY source
  `;

  // Win Rate by Deal Size
  const params3 = [];
  const vis3 = getLeadVisibilityClause(req, params3);
  const qSize = `
    SELECT 
      CASE 
        WHEN COALESCE(final_deal_value, estimated_deal_value, 0) < 25000 THEN 'Low (<$25k)'
        WHEN COALESCE(final_deal_value, estimated_deal_value, 0) <= 100000 THEN 'Medium ($25k-$100k)'
        ELSE 'High (>$100k)'
      END as key,
      COUNT(*) FILTER (WHERE sales_stage = 'Closed Won') as won,
      COUNT(*) FILTER (WHERE sales_stage IN ('Closed Won', 'Closed Lost')) as total
    FROM public.leads
    WHERE ${vis3}
    GROUP BY key
  `;

  // Loss Reason Keyword Classification
  const params4 = [];
  const vis4 = getLeadVisibilityClause(req, params4);
  const qLoss = `
    SELECT 
      CASE 
        WHEN close_notes ILIKE '%price%' OR close_notes ILIKE '%budget%' OR close_notes ILIKE '%expensive%' OR close_notes ILIKE '%cost%' THEN 'Price / Budget'
        WHEN close_notes ILIKE '%competitor%' OR close_notes ILIKE '%compete%' OR close_notes ILIKE '%other vendor%' THEN 'Competitor'
        WHEN close_notes ILIKE '%time%' OR close_notes ILIKE '%delay%' OR close_notes ILIKE '%timing%' OR close_notes ILIKE '%next year%' THEN 'Timing'
        WHEN close_notes ILIKE '%feature%' OR close_notes ILIKE '%product%' OR close_notes ILIKE '%require%' OR close_notes ILIKE '%missing%' THEN 'Product Fit'
        WHEN close_notes ILIKE '%no reply%' OR close_notes ILIKE '%ghost%' OR close_notes ILIKE '%no response%' OR close_notes ILIKE '%unresponsive%' THEN 'No Response'
        WHEN close_notes ILIKE '%internal%' OR close_notes ILIKE '%cancelled%' OR close_notes ILIKE '%changed mind%' THEN 'Internal Decision'
        ELSE 'Other'
      END as reason,
      COUNT(*) as count
    FROM public.leads
    WHERE sales_stage = 'Closed Lost' AND ${vis4}
    GROUP BY reason
    ORDER BY count DESC
  `;

  const [indRes, srcRes, sizeRes, lossRes] = await Promise.all([
    db.query(qIndustry, params1),
    db.query(qSource, params2),
    db.query(qSize, params3),
    db.query(qLoss, params4)
  ]);

  const mapRates = (rows) => rows.map(r => {
    const total = Number(r.total || 0);
    const won = Number(r.won || 0);
    return {
      key: r.key,
      won,
      lost: total - won,
      winRate: total > 0 ? Math.round((won / total) * 100) : 0
    };
  });

  return {
    byIndustry: mapRates(indRes.rows),
    bySource: mapRates(srcRes.rows),
    byDealSize: mapRates(sizeRes.rows),
    lossReasons: lossRes.rows.map(r => ({ reason: r.reason, count: Number(r.count) }))
  };
};

// 3. Sales Performance Benchmarking
const getSalesBenchmarking = async (req) => {
  const query = `
    SELECT 
      u.id,
      COALESCE(u.full_name, u.username, 'Unknown User') as representative,
      u.team,
      COUNT(l.id) FILTER (WHERE l.sales_stage = 'Closed Won') as won_count,
      COUNT(l.id) FILTER (WHERE l.sales_stage IN ('Closed Won', 'Closed Lost')) as total_closed,
      COALESCE(SUM(l.final_deal_value) FILTER (WHERE l.sales_stage = 'Closed Won'), 0)::float as revenue_closed,
      COALESCE(AVG(l.final_deal_value) FILTER (WHERE l.sales_stage = 'Closed Won'), 0)::float as avg_deal_size,
      COALESCE((
        SELECT COUNT(*)::int
        FROM public.lead_activities a 
        JOIN public.leads le ON a.lead_id = le.id
        WHERE le.assigned_to = u.id AND a.activity_type = 'Note Added'
      ), 0) as calls_logged,
      COALESCE((
        SELECT COUNT(*)::int
        FROM public.lead_activities a 
        JOIN public.leads le ON a.lead_id = le.id
        WHERE le.assigned_to = u.id AND a.activity_type = 'Email Sent'
      ), 0) as emails_sent,
      COALESCE(AVG(l.stage_duration_days) FILTER (WHERE l.sales_stage = 'Closed Won'), 0)::float as pipeline_velocity
    FROM public.users u
    LEFT JOIN public.leads l ON l.assigned_to = u.id
    WHERE u.role = 'REPRESENTATIVE'
    GROUP BY u.id, u.full_name, u.team
  `;

  const { rows } = await db.query(query);

  const reps = rows.map(r => {
    const total = Number(r.total_closed || 0);
    const won = Number(r.won_count || 0);
    return {
      id: r.id,
      representative: r.representative,
      team: r.team,
      revenueClosed: r.revenue_closed,
      winRate: total > 0 ? (won / total) * 100 : 0,
      avgDealSize: r.avg_deal_size,
      callsLogged: r.calls_logged,
      emailsSent: r.emails_sent,
      pipelineVelocity: r.pipeline_velocity
    };
  });

  // Calculate Averages
  const avgRev = reps.reduce((sum, r) => sum + r.revenueClosed, 0) / (reps.length || 1);
  const avgWin = reps.reduce((sum, r) => sum + r.winRate, 0) / (reps.length || 1);
  const avgSize = reps.reduce((sum, r) => sum + r.avgDealSize, 0) / (reps.length || 1);
  const avgCalls = reps.reduce((sum, r) => sum + r.callsLogged, 0) / (reps.length || 1);
  const avgEmails = reps.reduce((sum, r) => sum + r.emailsSent, 0) / (reps.length || 1);
  const avgVelocity = reps.reduce((sum, r) => sum + r.pipelineVelocity, 0) / (reps.length || 1);

  // Calculate Medians
  const medians = {
    revenueClosed: calculateMedian(reps.map(r => r.revenueClosed)),
    winRate: calculateMedian(reps.map(r => r.winRate)),
    avgDealSize: calculateMedian(reps.map(r => r.avgDealSize)),
    callsLogged: calculateMedian(reps.map(r => r.callsLogged)),
    emailsSent: calculateMedian(reps.map(r => r.emailsSent)),
    pipelineVelocity: calculateMedian(reps.map(r => r.pipelineVelocity))
  };

  const benchmarks = reps.map(r => ({
    ...r,
    ratings: {
      revenueClosed: getBenchmarkRating(r.revenueClosed, avgRev),
      winRate: getBenchmarkRating(r.winRate, avgWin),
      avgDealSize: getBenchmarkRating(r.avgDealSize, avgSize),
      callsLogged: getBenchmarkRating(r.callsLogged, avgCalls),
      emailsSent: getBenchmarkRating(r.emailsSent, avgEmails),
      pipelineVelocity: getBenchmarkRating(r.pipelineVelocity, avgVelocity)
    }
  }));

  return {
    representatives: benchmarks,
    teamMedians: medians,
    teamAverages: {
      revenueClosed: avgRev,
      winRate: avgWin,
      avgDealSize: avgSize,
      callsLogged: avgCalls,
      emailsSent: avgEmails,
      pipelineVelocity: avgVelocity
    }
  };
};

// 4. Forecast Trends
const getForecastTrends = async (req) => {
  const { period = 'monthly' } = req.query;
  const params = [];
  const visibility = getLeadVisibilityClause(req, params);

  let truncUnit = 'month';
  let formatString = 'YYYY-MM';

  if (period === 'quarterly') {
    truncUnit = 'quarter';
    formatString = 'YYYY-"Q"Q';
  } else if (period === 'yearly') {
    truncUnit = 'year';
    formatString = 'YYYY';
  }

  const query = `
    SELECT 
      TO_CHAR(DATE_TRUNC('${truncUnit}', created_at), '${formatString}') as period,
      COALESCE(SUM(final_deal_value) FILTER (WHERE sales_stage = 'Closed Won'), 0)::float as actual_revenue,
      COALESCE(SUM(forecast_revenue), 0)::float as forecast_revenue
    FROM public.leads
    WHERE ${visibility}
    GROUP BY DATE_TRUNC('${truncUnit}', created_at)
    ORDER BY DATE_TRUNC('${truncUnit}', created_at) ASC
  `;

  const { rows } = await db.query(query, params);

  return rows.map(r => {
    const actual = r.actual_revenue;
    const forecast = r.forecast_revenue;
    const variance = actual - forecast;
    const pct = forecast > 0 ? (actual / forecast) * 100 : (actual > 0 ? 100 : 0);

    return {
      period: r.period,
      actualRevenue: actual,
      forecastRevenue: forecast,
      variance,
      accuracy: Math.min(Math.round(pct), 100)
    };
  });
};

// 5. Whitelisted Dynamic Query Executor
const runDynamicWidgetQuery = async (req, config) => {
  const { metric, groupBy, dateRange, filters = {} } = config;

  // 1. Whitelist Validations
  if (!ALLOWED_METRICS.includes(metric)) {
    throw new Error(`Invalid metric: '${metric}'. Allowed: ${ALLOWED_METRICS.join(', ')}`);
  }
  if (groupBy && !ALLOWED_GROUPINGS.includes(groupBy)) {
    throw new Error(`Invalid groupBy: '${groupBy}'. Allowed: ${ALLOWED_GROUPINGS.join(', ')}`);
  }

  const params = [];
  const conditions = [];

  // Enforce Lead RLS Scopes
  conditions.push(getLeadVisibilityClause(req, params));

  // Date Range mapping
  if (dateRange && dateRange !== 'all') {
    if (dateRange === 'last_30_days') {
      conditions.push(`created_at >= NOW() - INTERVAL '30 days'`);
    } else if (dateRange === 'last_90_days') {
      conditions.push(`created_at >= NOW() - INTERVAL '90 days'`);
    } else if (dateRange === 'last_12_months') {
      conditions.push(`created_at >= NOW() - INTERVAL '12 months'`);
    }
  }

  // Parameterized filters
  if (filters.team) {
    params.push(filters.team);
    conditions.push(`team = $${params.length}`);
  }
  if (filters.sales_stage) {
    params.push(filters.sales_stage);
    conditions.push(`sales_stage = $${params.length}`);
  }

  // Construct Metric Statement
  let selectMetric = '';
  if (metric === 'count' || metric === 'lead_count') {
    selectMetric = 'COUNT(*)::int as value';
  } else if (metric === 'sum_deal_value') {
    selectMetric = 'COALESCE(SUM(final_deal_value) FILTER (WHERE sales_stage = \'Closed Won\'), SUM(estimated_deal_value), 0)::float as value';
  } else if (metric === 'avg_deal_value') {
    selectMetric = 'COALESCE(AVG(final_deal_value) FILTER (WHERE sales_stage = \'Closed Won\'), AVG(estimated_deal_value), 0)::float as value';
  } else if (metric === 'win_rate') {
    selectMetric = 'ROUND((COUNT(*) FILTER (WHERE sales_stage = \'Closed Won\') * 100.0) / NULLIF(COUNT(*) FILTER (WHERE sales_stage IN (\'Closed Won\', \'Closed Lost\')), 0), 1)::float as value';
  } else if (metric === 'avg_stage_duration') {
    selectMetric = 'COALESCE(AVG(stage_duration_days), 0)::float as value';
  } else if (metric === 'forecast_revenue') {
    selectMetric = 'COALESCE(SUM(forecast_revenue), 0)::float as value';
  } else if (metric === 'conversion_rate') {
    selectMetric = 'ROUND((COUNT(*) FILTER (WHERE sales_stage != \'New Lead\' AND sales_stage != \'Closed Lost\') * 100.0) / NULLIF(COUNT(*), 0), 1)::float as value';
  }

  // Construct Group-By Select and Group-By Clauses
  let selectGroup = '';
  let groupByClause = '';

  if (groupBy) {
    if (groupBy === 'sales_stage') {
      selectGroup = 'sales_stage as label';
      groupByClause = 'GROUP BY sales_stage';
    } else if (groupBy === 'lead_source') {
      selectGroup = 'COALESCE(source, \'Unknown\') as label';
      groupByClause = 'GROUP BY source';
    } else if (groupBy === 'team') {
      selectGroup = 'COALESCE(team, \'Unassigned\') as label';
      groupByClause = 'GROUP BY team';
    } else if (groupBy === 'assigned_to') {
      selectGroup = 'COALESCE((SELECT full_name FROM users WHERE id = assigned_to), \'Unassigned\') as label';
      groupByClause = 'GROUP BY assigned_to';
    } else if (groupBy === 'created_month') {
      selectGroup = 'TO_CHAR(created_at, \'YYYY-MM\') as label';
      groupByClause = 'GROUP BY DATE_TRUNC(\'month\', created_at), TO_CHAR(created_at, \'YYYY-MM\')';
    } else if (groupBy === 'industry') {
      selectGroup = 'COALESCE(industry, \'Unknown\') as label';
      groupByClause = 'GROUP BY industry';
    } else if (groupBy === 'quality') {
      selectGroup = `
        CASE 
          WHEN conversion_probability >= 80 THEN 'High'
          WHEN conversion_probability >= 50 THEN 'Medium'
          ELSE 'Low'
        END as label`;
      groupByClause = `
        GROUP BY CASE 
          WHEN conversion_probability >= 80 THEN 'High'
          WHEN conversion_probability >= 50 THEN 'Medium'
          ELSE 'Low'
        END`;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const selectClause = groupBy ? `${selectGroup}, ${selectMetric}` : selectMetric;
  const sql = `SELECT ${selectClause} FROM public.leads ${whereClause} ${groupByClause} ORDER BY label ASC NULLS LAST`;

  const { rows } = await db.query(sql, params);

  // Format response: if no groupBy, just return the scalar value, else return mapped labels
  if (!groupBy) {
    return { value: rows[0]?.value || 0 };
  }

  return rows.map(r => ({
    label: r.label,
    value: r.value || 0
  }));
};

module.exports = {
  getCohorts,
  getWinLossAnalysis,
  getSalesBenchmarking,
  getForecastTrends,
  runDynamicWidgetQuery
};
