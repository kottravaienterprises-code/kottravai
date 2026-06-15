const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper for formatting DB numeric responses
const getNum = (val) => Number(val || 0);

// 1. GET /api/admin/pipeline/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [statsRes, stageRes, qualityRes] = await Promise.all([
      db.query(`
        SELECT 
          COUNT(*) as total_leads,
          COUNT(*) FILTER (WHERE sales_stage != 'Closed Won' AND sales_stage != 'Closed Lost') as active_opportunities,
          SUM(estimated_deal_value) FILTER (WHERE sales_stage != 'Closed Lost') as total_pipeline_value,
          SUM(forecast_revenue) FILTER (WHERE sales_stage != 'Closed Lost') as expected_revenue,
          SUM(estimated_deal_value) FILTER (WHERE sales_stage = 'Closed Won') as closed_won_revenue,
          SUM(estimated_deal_value) FILTER (WHERE sales_stage = 'Closed Lost') as closed_lost_revenue,
          AVG(conversion_probability) FILTER (WHERE sales_stage != 'Closed Lost' AND conversion_probability > 0) as avg_conversion_probability,
          AVG(estimated_deal_value) FILTER (WHERE sales_stage != 'Closed Lost' AND estimated_deal_value > 0) as avg_deal_size
        FROM leads
      `),
      db.query(`SELECT sales_stage, COUNT(*) as count FROM leads WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost') GROUP BY sales_stage`),
      db.query(`
        SELECT 
          CASE 
            WHEN conversion_probability >= 80 THEN 'High'
            WHEN conversion_probability >= 50 THEN 'Medium'
            ELSE 'Low' 
          END as quality,
          COUNT(*) as count
        FROM leads 
        WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost') 
        GROUP BY quality
      `)
    ]);
    
    const data = statsRes.rows[0];

    const totalResolved = getNum(data.closed_won_revenue) + getNum(data.closed_lost_revenue);
    const winRate = totalResolved > 0 ? (getNum(data.closed_won_revenue) / totalResolved) * 100 : 0;
    
    // Simple Pipeline Health Score (based on avg probability and active opportunities)
    const avgProb = getNum(data.avg_conversion_probability);
    let healthScore = 'Poor';
    if (avgProb > 70) healthScore = 'Excellent';
    else if (avgProb > 40) healthScore = 'Good';
    else if (avgProb > 20) healthScore = 'Fair';

    res.json({
      success: true,
      data: {
        totalPipelineValue: getNum(data.total_pipeline_value),
        expectedRevenue: getNum(data.expected_revenue),
        activeOpportunities: getNum(data.active_opportunities),
        winRate: winRate,
        closedWonRevenue: getNum(data.closed_won_revenue),
        closedLostRevenue: getNum(data.closed_lost_revenue),
        avgDealSize: getNum(data.avg_deal_size),
        avgConversionProbability: avgProb,
        pipelineHealthScore: healthScore,
        leadsByStage: stageRes.rows.map(r => ({ sales_stage: r.sales_stage, count: getNum(r.count) })),
        leadsByQuality: qualityRes.rows.map(r => ({ quality: r.quality, count: getNum(r.count) }))
      }
    });
  } catch (error) {
    console.error('Pipeline Dashboard Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pipeline dashboard' });
  }
});

// 2. GET /api/admin/pipeline/funnel
router.get('/funnel', async (req, res) => {
  try {
    const q = `
      SELECT sales_stage, COUNT(*) as count, SUM(estimated_deal_value) as value
      FROM leads
      GROUP BY sales_stage
    `;
    const { rows } = await db.query(q);
    
    // Organize by stage order
    const stageOrder = ['New Lead', 'Qualified', 'Contacted', 'Proposal Sent', 'Negotiation', 'Closed Won'];
    let prevCount = 0;
    const funnel = stageOrder.map((stage, i) => {
      const row = rows.find(r => r.sales_stage === stage);
      const count = getNum(row?.count);
      const value = getNum(row?.value);
      
      let conversion = 100;
      let dropOff = 0;
      
      if (i > 0) {
        conversion = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
        dropOff = 100 - conversion;
      }
      prevCount = count;

      return {
        stage,
        count,
        value,
        conversion,
        dropOff
      };
    });

    res.json({ success: true, data: funnel });
  } catch (error) {
    console.error('Pipeline Funnel Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pipeline funnel' });
  }
});

// 3. GET /api/admin/pipeline/forecast
router.get('/forecast', async (req, res) => {
  try {
    // Basic heuristic: Higher probability deals close sooner. 
    // We group Expected Revenue (forecast_revenue) into time buckets.
    const q = `
      SELECT 
        SUM(forecast_revenue) FILTER (WHERE conversion_probability >= 80) as days_30,
        SUM(forecast_revenue) FILTER (WHERE conversion_probability >= 50 AND conversion_probability < 80) as days_90,
        SUM(forecast_revenue) FILTER (WHERE conversion_probability >= 20 AND conversion_probability < 50) as quarter,
        SUM(forecast_revenue) FILTER (WHERE conversion_probability > 0 AND conversion_probability < 20) as annual
      FROM leads
      WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost')
    `;
    const { rows } = await db.query(q);
    const data = rows[0];

    res.json({
      success: true,
      data: {
        forecast30Days: getNum(data.days_30),
        forecast90Days: getNum(data.days_30) + getNum(data.days_90),
        forecastQuarterly: getNum(data.days_30) + getNum(data.days_90) + getNum(data.quarter),
        forecastAnnual: getNum(data.days_30) + getNum(data.days_90) + getNum(data.quarter) + getNum(data.annual)
      }
    });
  } catch (error) {
    console.error('Pipeline Forecast Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch revenue forecast' });
  }
});

// 4. GET /api/admin/pipeline/opportunities
router.get('/opportunities', async (req, res) => {
  try {
    const q = `
      SELECT id, name, company, email, phone, sales_stage, lead_score, conversion_probability, estimated_deal_value, forecast_revenue
      FROM leads
      WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost')
      ORDER BY conversion_probability DESC, estimated_deal_value DESC
      LIMIT 10
    `;
    const { rows } = await db.query(q);
    
    // Transform formatting for frontend
    const opportunities = rows.map(r => ({
      id: r.id,
      name: r.name,
      company: r.company || 'Unknown',
      contact: r.email || r.phone,
      stage: r.sales_stage,
      probability: r.conversion_probability,
      score: r.lead_score,
      value: getNum(r.estimated_deal_value),
      forecast: getNum(r.forecast_revenue)
    }));

    res.json({ success: true, data: opportunities });
  } catch (error) {
    console.error('Pipeline Opportunities Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch top opportunities' });
  }
});

// 5. GET /api/admin/pipeline/executive-summary
router.get('/executive-summary', async (req, res) => {
  try {
    const q = `
      SELECT 
        COUNT(*) as total_leads,
        SUM(forecast_revenue) FILTER (WHERE sales_stage != 'Closed Lost') as expected_revenue,
        SUM(estimated_deal_value) FILTER (WHERE sales_stage = 'Closed Won') as closed_won_revenue
      FROM leads
    `;
    const { rows } = await db.query(q);
    const d = rows[0];

    const expRev = getNum(d.expected_revenue);
    const wonRev = getNum(d.closed_won_revenue);
    const totalLeads = getNum(d.total_leads);

    let healthStr = "Healthy";
    if (expRev < 5000) healthStr = "Needs Attention";
    
    const summaryText = `The sales pipeline is currently ${healthStr}. We have accumulated ₹${wonRev.toLocaleString('en-IN')} in closed-won revenue across the system. The total projected forecast revenue from active opportunities stands at ₹${expRev.toLocaleString('en-IN')}. There are ${totalLeads} total leads in the system. Sales teams should focus on advancing leads currently in Negotiation to maximize the 30-day forecast.`;

    res.json({ 
      success: true, 
      data: {
        summary: summaryText,
        pipelineHealth: healthStr,
        forecastRevenue: expRev,
        atRiskLeads: Math.floor(totalLeads * 0.1) // Placeholder logic for at-risk
      }
    });
  } catch (error) {
    console.error('Executive Summary Error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate executive summary' });
  }
});

// 6. GET /api/admin/pipeline/performance
router.get('/performance', async (req, res) => {
  try {
    const q1 = `SELECT COUNT(*) as count FROM leads WHERE created_at >= NOW() - INTERVAL '30 days'`;
    const q2 = `SELECT COUNT(*) as count FROM leads WHERE sales_stage = 'Closed Won' AND closed_won_at >= NOW() - INTERVAL '30 days'`;
    const q3 = `SELECT activity_type, COUNT(*) as count FROM lead_activities WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY activity_type`;
    
    const [leadsRes, wonRes, actRes] = await Promise.all([
      db.query(q1),
      db.query(q2),
      db.query(q3)
    ]);
    
    let emailsSent = 0;
    let whatsappSent = 0;
    let callsLogged = 0;
    let followUps = 0;
    
    actRes.rows.forEach(r => {
      const type = r.activity_type.toLowerCase();
      if (type.includes('email')) emailsSent += getNum(r.count);
      if (type.includes('whatsapp')) whatsappSent += getNum(r.count);
      if (type.includes('call')) callsLogged += getNum(r.count);
      if (type.includes('follow-up') || type.includes('followup')) followUps += getNum(r.count);
    });

    res.json({
      success: true,
      data: {
        leadsCreated: getNum(leadsRes.rows[0]?.count),
        opportunitiesWon: getNum(wonRes.rows[0]?.count),
        emailsSent,
        whatsappSent,
        callsLogged,
        followUpsCompleted: followUps,
        averageResponseTime: '2.5 hrs' // Mocked for now
      }
    });
  } catch (error) {
    console.error('Pipeline Performance Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch performance metrics' });
  }
});

// 7. GET /api/admin/pipeline/health
router.get('/health', async (req, res) => {
  try {
    const q = `
      SELECT 
        COUNT(*) as total_active,
        AVG(lead_score) as avg_lead_score,
        AVG(conversion_probability) as avg_prob,
        COUNT(*) FILTER (WHERE sales_stage NOT IN ('New Lead', 'Closed Won', 'Closed Lost')) as progressed_count,
        (SELECT COUNT(*) FROM lead_activities WHERE created_at >= NOW() - INTERVAL '30 days') as recent_activities,
        (
          SELECT COUNT(*) 
          FROM leads l 
          WHERE l.sales_stage NOT IN ('Closed Won', 'Closed Lost') 
            AND NOT EXISTS (
              SELECT 1 FROM lead_activities a 
              WHERE a.lead_id = l.id AND a.created_at >= NOW() - INTERVAL '30 days'
            )
        ) as stale_count
      FROM leads
      WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost')
    `;

    const tasksQ = `
      SELECT 
        COUNT(*) FILTER (WHERE task_status = 'completed') as completed,
        COUNT(*) as total
      FROM lead_tasks
    `;

    const [statsRes, tasksRes] = await Promise.all([
      db.query(q),
      db.query(tasksQ)
    ]);

    const stats = statsRes.rows[0];
    const totalActive = getNum(stats?.total_active);
    
    const qualityFactor = getNum(stats?.avg_lead_score); // 0-100
    const probFactor = getNum(stats?.avg_prob); // 0-100
    const progressionFactor = totalActive > 0 ? (getNum(stats?.progressed_count) / totalActive) * 100 : 0;
    
    const totalTasks = getNum(tasksRes.rows[0]?.total);
    const completedTasks = getNum(tasksRes.rows[0]?.completed);
    const followupFactor = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 85; 

    const recentAct = getNum(stats?.recent_activities);
    const commRate = totalActive > 0 ? (recentAct / totalActive) : 0;
    const commFactor = Math.min(100, commRate * 15); 

    const staleCount = getNum(stats?.stale_count);
    const staleRate = totalActive > 0 ? (staleCount / totalActive) * 100 : 0;
    const staleFactor = Math.max(0, 100 - staleRate);

    // Weighting:
    // Lead Quality                 25%
    // Conversion Probability       20%
    // Stage Progression            20%
    // Follow-up Completion         15%
    // Communication Activity       10%
    // Stale Lead Penalty           10%
    const score = Math.round(
      (qualityFactor * 0.25) +
      (probFactor * 0.20) +
      (progressionFactor * 0.20) +
      (followupFactor * 0.15) +
      (commFactor * 0.10) +
      (staleFactor * 0.10)
    );

    let status = 'Critical';
    if (score >= 80) status = 'Excellent';
    else if (score >= 60) status = 'Good';
    else if (score >= 40) status = 'Needs Attention';

    res.json({
      success: true,
      data: {
        score,
        status,
        factors: {
          leadQuality: Math.round(qualityFactor),
          conversionProbability: Math.round(probFactor),
          stageProgression: Math.round(progressionFactor),
          followupCompletion: Math.round(followupFactor),
          communicationActivity: Math.round(commFactor),
          staleLeadPenalty: Math.round(staleFactor)
        },
        metrics: {
          activeOpportunities: totalActive,
          staleLeads: staleCount,
          recentActivities: recentAct,
          completedTasks,
          totalTasks
        }
      }
    });
  } catch (error) {
    console.error('Pipeline Health Error:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate pipeline health score' });
  }
});

// 8. GET /api/admin/pipeline/insights
router.get('/insights', async (req, res) => {
  try {
    const [statsRes, oppsRes] = await Promise.all([
      db.query(`
        SELECT 
          COUNT(*) as total_active,
          COALESCE(SUM(estimated_deal_value), 0) as total_val,
          COALESCE(SUM(forecast_revenue), 0) as expected_val,
          (
            SELECT COUNT(*) 
            FROM leads l 
            WHERE l.sales_stage NOT IN ('Closed Won', 'Closed Lost') 
              AND NOT EXISTS (
                SELECT 1 FROM lead_activities a 
                WHERE a.lead_id = l.id AND a.created_at >= NOW() - INTERVAL '30 days'
              )
          ) as stale_count
        FROM leads
        WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost')
      `),
      db.query(`
        SELECT sales_stage, COUNT(*) as count, SUM(estimated_deal_value) as value
        FROM leads
        WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost')
        GROUP BY sales_stage
        ORDER BY value DESC
      `)
    ]);

    const stats = statsRes.rows[0];
    const totalActive = getNum(stats?.total_active);
    const totalVal = getNum(stats?.total_val);
    const expectedVal = getNum(stats?.expected_val);
    const staleCount = getNum(stats?.stale_count);
    
    const stageCounts = oppsRes.rows;
    const highestStage = stageCounts[0]?.sales_stage || 'N/A';
    const highestStageValue = getNum(stageCounts[0]?.value);

    const formatCurrencyInLakhs = (val) => {
      if (val >= 100000) {
        return `₹${(val / 100000).toFixed(1)} Lakhs`;
      }
      return `₹${val.toLocaleString('en-IN')}`;
    };

    const fallbackSummary = `The pipeline contains ${totalActive} active opportunities with an expected revenue of ${formatCurrencyInLakhs(expectedVal)} (total pipeline value of ${formatCurrencyInLakhs(totalVal)}). Overall pipeline activity is stable, but attention is needed on resolving pending deals.`;
    
    const fallbackOpportunities = [
      {
        title: `${highestStage} Stage Concentration`,
        description: `${highestStage}-stage leads represent our largest revenue category, totaling ${formatCurrencyInLakhs(highestStageValue)}. Priority should be given to moving these deals forward.`,
        value: highestStageValue
      },
      {
        title: "High-Probability Wins",
        description: `Deals with conversion probability >= 80% have the potential to close quickly and secure the immediate forecast.`,
        value: Math.round(expectedVal * 0.4)
      }
    ];

    const fallbackRisks = [
      {
        title: `${staleCount} Stale Opportunities`,
        description: `There are ${staleCount} deals with no communication logged in the last 30 days. These present a leakage risk.`,
        impact: staleCount > 5 ? "High" : "Medium"
      }
    ];

    const fallbackRecommendations = [
      `Focus sales team activity on closing negotiation-stage opportunities to secure short-term revenue.`,
      `Re-engage with the ${staleCount} inactive leads immediately to check buying intent.`
    ];

    const fallbackJson = {
      summary: fallbackSummary,
      opportunities: fallbackOpportunities,
      risks: fallbackRisks,
      recommendations: fallbackRecommendations
    };

    const aiProvider = require('../services/aiProvider');
    if (aiProvider && (process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY)) {
      const systemPrompt = "You are a professional executive sales director. Analyze the provided sales metrics and output valid JSON only.";
      const userMessage = `
Analyze the following sales pipeline metrics:
- Active Opportunities: ${totalActive}
- Total Pipeline Value: ${formatCurrencyInLakhs(totalVal)}
- Expected Revenue Forecast: ${formatCurrencyInLakhs(expectedVal)}
- Stale Leads Count: ${staleCount}
- Highest Revenue Stage: ${highestStage} (Value: ${formatCurrencyInLakhs(highestStageValue)})

Return strictly JSON format:
{
  "summary": "Narrative paragraph summarizing the pipeline status...",
  "opportunities": [
    { "title": "Opportunity title", "description": "Details...", "value": 125000 }
  ],
  "risks": [
    { "title": "Risk title", "description": "Details...", "impact": "High/Medium/Low" }
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2"
  ]
}
`;
      try {
        const response = await aiProvider.generateContent(systemPrompt, userMessage);
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json({
            success: true,
            data: parsed,
            aiGenerated: true
          });
        }
      } catch (aiError) {
        console.warn('AI insight generation failed, falling back to data-driven report:', aiError.message);
      }
    }

    res.json({
      success: true,
      data: fallbackJson,
      aiGenerated: false
    });

  } catch (error) {
    console.error('Pipeline Insights Error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate pipeline insights' });
  }
});

// 9. GET /api/admin/pipeline/trends
router.get('/trends', async (req, res) => {
  try {
    const q30d = `
      SELECT 
        d.day_date::date::text as date_label,
        COALESCE((SELECT COUNT(*) FROM leads WHERE created_at::date = d.day_date), 0)::int as leads_created,
        COALESCE((SELECT COUNT(*) FROM leads WHERE created_at::date = d.day_date AND sales_stage = 'Qualified'), 0)::int as leads_qualified,
        COALESCE((SELECT SUM(forecast_revenue) FROM leads WHERE created_at::date = d.day_date AND sales_stage NOT IN ('Closed Won', 'Closed Lost')), 0)::float as forecast_revenue,
        COALESCE((SELECT COUNT(*) FROM lead_activities WHERE created_at::date = d.day_date), 0)::int as activity_count
      FROM (
        SELECT GENERATE_SERIES(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day')::date as day_date
      ) d
      ORDER BY date_label;
    `;

    const q90d = `
      SELECT 
        w.week_date::date::text as date_label,
        COALESCE((SELECT COUNT(*) FROM leads WHERE DATE_TRUNC('week', created_at) = w.week_date), 0)::int as leads_created,
        COALESCE((SELECT COUNT(*) FROM leads WHERE DATE_TRUNC('week', created_at) = w.week_date AND sales_stage = 'Qualified'), 0)::int as leads_qualified,
        COALESCE((SELECT SUM(forecast_revenue) FROM leads WHERE DATE_TRUNC('week', created_at) = w.week_date AND sales_stage NOT IN ('Closed Won', 'Closed Lost')), 0)::float as forecast_revenue,
        COALESCE((SELECT COUNT(*) FROM lead_activities WHERE DATE_TRUNC('week', created_at) = w.week_date), 0)::int as activity_count
      FROM (
        SELECT DISTINCT DATE_TRUNC('week', GENERATE_SERIES(CURRENT_DATE - INTERVAL '89 days', CURRENT_DATE, '1 day')) as week_date
      ) w
      ORDER BY date_label;
    `;

    const q12m = `
      SELECT 
        m.month_date::date::text as date_label,
        COALESCE((SELECT COUNT(*) FROM leads WHERE DATE_TRUNC('month', created_at) = m.month_date), 0)::int as leads_created,
        COALESCE((SELECT COUNT(*) FROM leads WHERE DATE_TRUNC('month', created_at) = m.month_date AND sales_stage = 'Qualified'), 0)::int as leads_qualified,
        COALESCE((SELECT SUM(forecast_revenue) FROM leads WHERE DATE_TRUNC('month', created_at) = m.month_date AND sales_stage NOT IN ('Closed Won', 'Closed Lost')), 0)::float as forecast_revenue,
        COALESCE((SELECT COUNT(*) FROM lead_activities WHERE DATE_TRUNC('month', created_at) = m.month_date), 0)::int as activity_count
      FROM (
        SELECT DISTINCT DATE_TRUNC('month', GENERATE_SERIES(CURRENT_DATE - INTERVAL '11 months', CURRENT_DATE, '1 month')) as month_date
      ) m
      ORDER BY date_label;
    `;

    const [res30d, res90d, res12m] = await Promise.all([
      db.query(q30d),
      db.query(q90d),
      db.query(q12m)
    ]);

    res.json({
      success: true,
      data: {
        '30d': res30d.rows,
        '90d': res90d.rows,
        '12m': res12m.rows
      }
    });
  } catch (error) {
    console.error('Pipeline Trends Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pipeline trends' });
  }
});

// 10. GET /api/admin/pipeline/forecast-accuracy
router.get('/forecast-accuracy', async (req, res) => {
  try {
    const q = `
      SELECT 
        COALESCE(SUM(estimated_deal_value) FILTER (WHERE sales_stage = 'Closed Won' AND closed_won_at >= NOW() - INTERVAL '90 days'), 0) as actual_revenue,
        COALESCE(SUM(estimated_deal_value * (COALESCE(lead_score, 50)::numeric / 100.0)) FILTER (WHERE sales_stage IN ('Closed Won', 'Closed Lost') AND (closed_won_at >= NOW() - INTERVAL '90 days' OR closed_lost_at >= NOW() - INTERVAL '90 days')), 0) as forecasted_revenue
      FROM leads
    `;

    const qTrend = `
      SELECT 
        m.month_date::date::text as month_label,
        COALESCE((
          SELECT SUM(estimated_deal_value) 
          FROM leads 
          WHERE sales_stage = 'Closed Won' 
            AND DATE_TRUNC('month', closed_won_at) = m.month_date
        ), 0)::float as actual_revenue,
        COALESCE((
          SELECT SUM(estimated_deal_value * (COALESCE(lead_score, 50)::numeric / 100.0)) 
          FROM leads 
          WHERE sales_stage IN ('Closed Won', 'Closed Lost') 
            AND (
              (sales_stage = 'Closed Won' AND DATE_TRUNC('month', closed_won_at) = m.month_date)
              OR (sales_stage = 'Closed Lost' AND DATE_TRUNC('month', closed_lost_at) = m.month_date)
            )
        ), 0)::float as forecasted_revenue
      FROM (
        SELECT DISTINCT DATE_TRUNC('month', GENERATE_SERIES(CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE, '1 month')) as month_date
      ) m
      ORDER BY month_label
    `;

    const [statsRes, trendRes] = await Promise.all([
      db.query(q),
      db.query(qTrend)
    ]);

    const actual = getNum(statsRes.rows[0]?.actual_revenue);
    const forecast = getNum(statsRes.rows[0]?.forecasted_revenue);

    let accuracy = 100;
    let variance = actual - forecast;
    let variancePercent = 0;
    
    if (actual > 0) {
      accuracy = Math.max(0, 100 - (Math.abs(actual - forecast) / actual) * 100);
      variancePercent = Math.round((variance / actual) * 10000) / 100;
    } else if (forecast > 0) {
      accuracy = 0;
      variancePercent = -100;
    }

    let confidence = 'Low';
    if (accuracy >= 90) confidence = 'High';
    else if (accuracy >= 75) confidence = 'Medium';

    // Calculate trend details
    const trendData = trendRes.rows.map(row => {
      const act = getNum(row.actual_revenue);
      const fore = getNum(row.forecasted_revenue);
      let acc = 100;
      if (act > 0) {
        acc = Math.round(Math.max(0, 100 - (Math.abs(act - fore) / act) * 100) * 100) / 100;
      } else if (fore > 0) {
        acc = 0;
      }
      return {
        month: new Date(row.month_label).toLocaleString('default', { month: 'short', year: '2-digit' }),
        actual: act,
        forecast: fore,
        accuracy: acc
      };
    });

    res.json({
      success: true,
      data: {
        actualRevenue: actual,
        forecastRevenue: forecast,
        variance,
        variancePercent,
        accuracy: Math.round(accuracy * 100) / 100, 
        confidence,
        trend: trendData
      }
    });
  } catch (error) {
    console.error('Forecast Accuracy Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch forecast accuracy metrics' });
  }
});

// 11. GET /api/admin/pipeline/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const isDemo = req.query.demo_mode === 'true';
    
    if (isDemo) {
      const demoReps = [
        {
          rep_name: 'Sarah Jenkins',
          leads_managed: 24,
          emails_sent: 184,
          whatsapp_sent: 92,
          calls_logged: 48,
          opportunities_won: 9,
          revenue_closed: 850000
        },
        {
          rep_name: 'David Chen',
          leads_managed: 18,
          emails_sent: 142,
          whatsapp_sent: 78,
          calls_logged: 36,
          opportunities_won: 6,
          revenue_closed: 620000
        },
        {
          rep_name: 'Alex Rivera',
          leads_managed: 15,
          emails_sent: 120,
          whatsapp_sent: 65,
          calls_logged: 28,
          opportunities_won: 4,
          revenue_closed: 410000
        }
      ];
      return res.json({ success: true, data: demoReps, isDemo: true });
    }

    const q = `
      SELECT 
        rep.rep_id,
        rep.rep_name,
        rep.leads_managed,
        rep.opportunities_won,
        rep.revenue_closed,
        COALESCE(act.emails_sent, 0)::int as emails_sent,
        COALESCE(act.whatsapp_sent, 0)::int as whatsapp_sent,
        COALESCE(act.calls_logged, 0)::int as calls_logged
      FROM (
        SELECT 
          l.assigned_to::text as rep_id,
          COALESCE(u.full_name, u.username, 'Sales Agent (' || SUBSTRING(l.assigned_to::text FROM 1 FOR 4) || ')') as rep_name,
          COUNT(l.id)::int as leads_managed,
          COUNT(l.id) FILTER (WHERE l.sales_stage = 'Closed Won')::int as opportunities_won,
          COALESCE(SUM(l.estimated_deal_value) FILTER (WHERE l.sales_stage = 'Closed Won'), 0)::float as revenue_closed
        FROM leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        WHERE l.assigned_to IS NOT NULL
        GROUP BY l.assigned_to, u.full_name, u.username
      ) rep
      LEFT JOIN (
        SELECT 
          l.assigned_to::text as rep_id,
          COUNT(a.id) FILTER (WHERE a.activity_type ILIKE '%email%')::int as emails_sent,
          COUNT(a.id) FILTER (WHERE a.activity_type ILIKE '%whatsapp%')::int as whatsapp_sent,
          COUNT(a.id) FILTER (WHERE a.activity_type ILIKE '%call%')::int as calls_logged
        FROM leads l
        JOIN lead_activities a ON l.id = a.lead_id
        WHERE l.assigned_to IS NOT NULL
        GROUP BY l.assigned_to
      ) act ON rep.rep_id = act.rep_id
      ORDER BY rep.revenue_closed DESC, rep.opportunities_won DESC
    `;
    const { rows } = await db.query(q);

    res.json({ success: true, data: rows, isDemo: false });
  } catch (error) {
    console.error('Leaderboard Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sales leaderboard' });
  }
});

// 12. POST /api/admin/pipeline/report/send-email
router.post('/report/send-email', async (req, res) => {
  try {
    const { recipient, reportType = 'weekly' } = req.body;
    if (!recipient) {
      return res.status(400).json({ success: false, error: 'Recipient email is required' });
    }

    const mailer = require('../utils/mailer');

    const [healthRes, dashboardRes, forecastRes, oppsRes, leaderboardRes] = await Promise.all([
      db.query(`
        SELECT 
          COUNT(*) as total_active,
          AVG(lead_score) as avg_lead_score,
          AVG(conversion_probability) as avg_prob
        FROM leads
        WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost')
      `),
      db.query(`
        SELECT 
          COUNT(*) as total_leads,
          SUM(estimated_deal_value) FILTER (WHERE sales_stage != 'Closed Lost') as total_pipeline_value,
          SUM(forecast_revenue) FILTER (WHERE sales_stage != 'Closed Lost') as expected_revenue
        FROM leads
      `),
      db.query(`
        SELECT 
          SUM(forecast_revenue) FILTER (WHERE conversion_probability >= 80) as days_30,
          SUM(forecast_revenue) FILTER (WHERE conversion_probability >= 50 AND conversion_probability < 80) as days_90
        FROM leads
        WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost')
      `),
      db.query(`
        SELECT name, company, sales_stage, estimated_deal_value, conversion_probability
        FROM leads
        WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost')
        ORDER BY conversion_probability DESC, estimated_deal_value DESC
        LIMIT 5
      `),
      db.query(`
        SELECT 
          COALESCE(u.full_name, u.username, 'Sales Rep') as rep_name,
          COUNT(l.id) FILTER (WHERE l.sales_stage = 'Closed Won')::int as opportunities_won,
          COALESCE(SUM(l.estimated_deal_value) FILTER (WHERE l.sales_stage = 'Closed Won'), 0)::float as revenue_closed
        FROM leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        WHERE l.assigned_to IS NOT NULL
        GROUP BY l.assigned_to, u.full_name, u.username
        LIMIT 3
      `)
    ]);

    const activeCount = getNum(healthRes.rows[0]?.total_active);
    const score = Math.round(
      (getNum(healthRes.rows[0]?.avg_lead_score) * 0.4) + 
      (getNum(healthRes.rows[0]?.avg_prob) * 0.4) + 20
    ); 
    let healthStatus = 'Good';
    if (score >= 80) healthStatus = 'Excellent';
    else if (score < 40) healthStatus = 'Critical';
    else if (score < 60) healthStatus = 'Needs Attention';

    const pipelineVal = getNum(dashboardRes.rows[0]?.total_pipeline_value);
    const expectedVal = getNum(dashboardRes.rows[0]?.expected_revenue);

    const f30 = getNum(forecastRes.rows[0]?.days_30);
    const f90 = f30 + getNum(forecastRes.rows[0]?.days_90);

    let oppRows = '';
    oppsRes.rows.forEach(opp => {
      oppRows += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${opp.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${opp.company || 'Unknown'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${opp.sales_stage}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #8E2A8B;">₹${getNum(opp.estimated_deal_value).toLocaleString('en-IN')}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${opp.conversion_probability}%</td>
        </tr>
      `;
    });

    let repRows = '';
    leaderboardRes.rows.forEach(rep => {
      repRows += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${rep.rep_name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${rep.opportunities_won}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">₹${getNum(rep.revenue_closed).toLocaleString('en-IN')}</td>
        </tr>
      `;
    });

    if (!repRows) {
      repRows = '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #999;">No representative activity data available yet.</td></tr>';
    }

    const reportTypeName = reportType.toLowerCase() === 'monthly' ? 'Monthly' : 'Weekly';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background-color: #2D1B4E; padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">KOTTRAVAI</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #D490D8; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Executive Sales Intelligence Report (${reportTypeName})</p>
        </div>
        
        <div style="padding: 24px; background-color: #fcfbfd;">
          <div style="background-color: white; border: 1px solid #f0edf4; border-radius: 8px; padding: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; border-left: 4px solid #8E2A8B;">
            <div>
              <h3 style="margin: 0; color: #555; font-size: 12px; text-transform: uppercase; font-weight: bold;">Pipeline Health Score</h3>
              <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: 900; color: #2D1B4E;">${score} / 100</p>
            </div>
            <div style="background-color: #fcf4fc; border: 1px solid #ebb3f4; padding: 6px 12px; border-radius: 20px; font-weight: bold; color: #8E2A8B; font-size: 14px;">
              ${healthStatus}
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="width: 50%; padding: 8px; vertical-align: top;">
                <div style="background-color: white; border: 1px solid #f0edf4; border-radius: 8px; padding: 16px; min-height: 80px;">
                  <span style="color: #999; font-size: 11px; text-transform: uppercase; font-weight: bold;">Total Active Pipeline</span>
                  <div style="font-size: 20px; font-weight: bold; color: #2D1B4E; margin-top: 5px;">₹${pipelineVal.toLocaleString('en-IN')}</div>
                  <div style="color: #999; font-size: 11px; margin-top: 3px;">${activeCount} opportunities</div>
                </div>
              </td>
              <td style="width: 50%; padding: 8px; vertical-align: top;">
                <div style="background-color: white; border: 1px solid #f0edf4; border-radius: 8px; padding: 16px; min-height: 80px;">
                  <span style="color: #999; font-size: 11px; text-transform: uppercase; font-weight: bold;">Expected Forecast</span>
                  <div style="font-size: 20px; font-weight: bold; color: #8E2A8B; margin-top: 5px;">₹${expectedVal.toLocaleString('en-IN')}</div>
                  <div style="color: #999; font-size: 11px; margin-top: 3px;">Weighted probability</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="width: 50%; padding: 8px; vertical-align: top;">
                <div style="background-color: white; border: 1px solid #f0edf4; border-radius: 8px; padding: 16px; min-height: 80px;">
                  <span style="color: #999; font-size: 11px; text-transform: uppercase; font-weight: bold;">30-Day Forecast</span>
                  <div style="font-size: 18px; font-weight: bold; color: #2D1B4E; margin-top: 5px;">₹${f30.toLocaleString('en-IN')}</div>
                </div>
              </td>
              <td style="width: 50%; padding: 8px; vertical-align: top;">
                <div style="background-color: white; border: 1px solid #f0edf4; border-radius: 8px; padding: 16px; min-height: 80px;">
                  <span style="color: #999; font-size: 11px; text-transform: uppercase; font-weight: bold;">90-Day Forecast</span>
                  <div style="font-size: 18px; font-weight: bold; color: #2D1B4E; margin-top: 5px;">₹${f90.toLocaleString('en-IN')}</div>
                </div>
              </td>
            </tr>
          </table>

          <div style="background-color: white; border: 1px solid #f0edf4; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; color: #2D1B4E; font-size: 15px; font-weight: bold; border-bottom: 2px solid #f0edf4; padding-bottom: 5px;">Top Sales Opportunities</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background-color: #fafafa; text-align: left;">
                  <th style="padding: 8px; font-weight: bold; color: #555;">Name</th>
                  <th style="padding: 8px; font-weight: bold; color: #555;">Company</th>
                  <th style="padding: 8px; font-weight: bold; color: #555;">Stage</th>
                  <th style="padding: 8px; font-weight: bold; color: #555;">Value</th>
                  <th style="padding: 8px; font-weight: bold; color: #555;">Prob</th>
                </tr>
              </thead>
              <tbody>
                ${oppRows || '<tr><td colspan="5" style="padding: 10px; text-align: center; color: #999;">No active opportunities available.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div style="background-color: white; border: 1px solid #f0edf4; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; color: #2D1B4E; font-size: 15px; font-weight: bold; border-bottom: 2px solid #f0edf4; padding-bottom: 5px;">Top Performing Sales Representatives</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background-color: #fafafa; text-align: left;">
                  <th style="padding: 8px; font-weight: bold; color: #555;">Rep Name</th>
                  <th style="padding: 8px; font-weight: bold; color: #555; text-align: center;">Wins</th>
                  <th style="padding: 8px; font-weight: bold; color: #555; text-align: right;">Revenue Closed</th>
                </tr>
              </thead>
              <tbody>
                ${repRows}
              </tbody>
            </table>
          </div>

          <div style="background-color: #2D1B4E; color: white; border-radius: 8px; padding: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #D490D8;">Sales Intelligence Insights</h3>
            <p style="margin: 0 0 15px 0; font-size: 13px; line-height: 1.5; color: #fdf4fc;">
              The pipeline currently contains ${activeCount} active opportunities. The largest concentration of value sits within advanced stages. We recommend prioritizing high-probability negotiation deals and addressing stale opportunities immediately to minimize pipeline decay and secure forecasted revenue targets.
            </p>
          </div>

        </div>

        <div style="background-color: #f1ecf6; padding: 16px; text-align: center; font-size: 11px; color: #777;">
          This is an automated sales intelligence report generated by Kottravai CRM.<br/>
          &copy; 2026 Kottravai. All rights reserved.
        </div>
      </div>
    `;

    await mailer.sendEmail({
      to: recipient,
      subject: `Kottravai Pipeline Executive Summary Report (${reportTypeName})`,
      html: htmlBody,
      type: 'custom'
    });

    res.json({ success: true, message: `Executive report sent successfully to ${recipient}` });
  } catch (error) {
    console.error('Email Report Error:', error);
    res.status(500).json({ success: false, error: 'Failed to send executive report email' });
  }
});

module.exports = router;
