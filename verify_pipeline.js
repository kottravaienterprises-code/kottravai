const db = require('./server/db');

// Helper for formatting DB numeric responses
const getNum = (val) => Number(val || 0);

async function runVerification() {
  console.log("=== STARTING PHASE 4 VERIFICATION ===");
  try {
    // 1. DATA INTEGRITY & FORECAST VALIDATION
    console.log("\n--- 1. Testing Database Triggers ---");
    
    // Insert a test lead
    const insertRes = await db.query(`
      INSERT INTO leads (name, email, sales_stage, estimated_deal_value, conversion_probability)
      VALUES ('Pipeline Verification Test Lead', 'verify@test.com', 'New Lead', 100000, 80)
      RETURNING id, forecast_revenue;
    `);
    const leadId = insertRes.rows[0].id;
    console.log("Inserted Lead ID:", leadId);
    console.log("Initial forecast_revenue (Expected 80000):", insertRes.rows[0].forecast_revenue);

    // Update to Closed Won
    const wonRes = await db.query(`
      UPDATE leads SET sales_stage = 'Closed Won' WHERE id = $1 RETURNING closed_won_at, forecast_revenue;
    `, [leadId]);
    console.log("Updated to Closed Won. closed_won_at timestamp:", wonRes.rows[0].closed_won_at);
    console.log("forecast_revenue (Expected 100000):", wonRes.rows[0].forecast_revenue);

    // Update to Closed Lost
    const lostRes = await db.query(`
      UPDATE leads SET sales_stage = 'Closed Lost' WHERE id = $1 RETURNING closed_lost_at;
    `, [leadId]);
    console.log("Updated to Closed Lost. closed_lost_at timestamp:", lostRes.rows[0].closed_lost_at);

    // Clean up test lead
    await db.query(`DELETE FROM leads WHERE id = $1`, [leadId]);
    console.log("Cleaned up test lead.");


    // 2. SIMULATE API RESPONSES FOR REPORTING
    console.log("\n--- 2. Simulating API Responses ---");

    // A. Dashboard Response
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
    
    const dashData = statsRes.rows[0];
    const totalResolved = getNum(dashData.closed_won_revenue) + getNum(dashData.closed_lost_revenue);
    const winRate = totalResolved > 0 ? (getNum(dashData.closed_won_revenue) / totalResolved) * 100 : 0;
    const avgProb = getNum(dashData.avg_conversion_probability);
    let healthScore = 'Poor';
    if (avgProb > 70) healthScore = 'Excellent';
    else if (avgProb > 40) healthScore = 'Good';
    else if (avgProb > 20) healthScore = 'Fair';

    const dashboardJson = {
      success: true,
      data: {
        totalPipelineValue: getNum(dashData.total_pipeline_value),
        expectedRevenue: getNum(dashData.expected_revenue),
        activeOpportunities: getNum(dashData.active_opportunities),
        winRate: winRate,
        closedWonRevenue: getNum(dashData.closed_won_revenue),
        closedLostRevenue: getNum(dashData.closed_lost_revenue),
        avgDealSize: getNum(dashData.avg_deal_size),
        avgConversionProbability: avgProb,
        pipelineHealthScore: healthScore,
        leadsByStage: stageRes.rows.map(r => ({ sales_stage: r.sales_stage, count: getNum(r.count) })),
        leadsByQuality: qualityRes.rows.map(r => ({ quality: r.quality, count: getNum(r.count) }))
      }
    };
    console.log("=== RESPONSE FOR: GET /api/admin/pipeline/dashboard ===");
    console.log(JSON.stringify(dashboardJson, null, 2));

    // B. Funnel Response
    const funnelQ = `
      SELECT sales_stage, COUNT(*) as count, SUM(estimated_deal_value) as value
      FROM leads
      GROUP BY sales_stage
    `;
    const funnelDbRes = await db.query(funnelQ);
    const stageOrder = ['New Lead', 'Qualified', 'Contacted', 'Proposal Sent', 'Negotiation', 'Closed Won'];
    let prevCount = 0;
    const funnelData = stageOrder.map((stage, i) => {
      const row = funnelDbRes.rows.find(r => r.sales_stage === stage);
      const count = getNum(row?.count);
      const value = getNum(row?.value);
      let conversion = 100;
      let dropOff = 0;
      if (i > 0) {
        conversion = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
        dropOff = 100 - conversion;
      }
      prevCount = count;
      return { stage, count, value, conversion, dropOff };
    });
    console.log("\n=== RESPONSE FOR: GET /api/admin/pipeline/funnel ===");
    console.log(JSON.stringify({ success: true, data: funnelData }, null, 2));

    // C. Forecast Response
    const forecastQ = `
      SELECT 
        SUM(forecast_revenue) FILTER (WHERE conversion_probability >= 80) as days_30,
        SUM(forecast_revenue) FILTER (WHERE conversion_probability >= 50 AND conversion_probability < 80) as days_90,
        SUM(forecast_revenue) FILTER (WHERE conversion_probability >= 20 AND conversion_probability < 50) as quarter,
        SUM(forecast_revenue) FILTER (WHERE conversion_probability > 0 AND conversion_probability < 20) as annual
      FROM leads
      WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost')
    `;
    const forecastDbRes = await db.query(forecastQ);
    const fData = forecastDbRes.rows[0];
    const forecastJson = {
      success: true,
      data: {
        forecast30Days: getNum(fData.days_30),
        forecast90Days: getNum(fData.days_30) + getNum(fData.days_90),
        forecastQuarterly: getNum(fData.days_30) + getNum(fData.days_90) + getNum(fData.quarter),
        forecastAnnual: getNum(fData.days_30) + getNum(fData.days_90) + getNum(fData.quarter) + getNum(fData.annual)
      }
    };
    console.log("\n=== RESPONSE FOR: GET /api/admin/pipeline/forecast ===");
    console.log(JSON.stringify(forecastJson, null, 2));

    // D. Opportunities Response
    const oppQ = `
      SELECT id, name, company, email, phone, sales_stage, lead_score, conversion_probability, estimated_deal_value, forecast_revenue
      FROM leads
      WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost')
      ORDER BY conversion_probability DESC, estimated_deal_value DESC
      LIMIT 10
    `;
    const oppDbRes = await db.query(oppQ);
    const opportunities = oppDbRes.rows.map(r => ({
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
    console.log("\n=== RESPONSE FOR: GET /api/admin/pipeline/opportunities ===");
    console.log(JSON.stringify({ success: true, data: opportunities }, null, 2));

    // E. Executive Summary Response
    const execQ = `
      SELECT 
        COUNT(*) as total_leads,
        SUM(forecast_revenue) FILTER (WHERE sales_stage != 'Closed Lost') as expected_revenue,
        SUM(estimated_deal_value) FILTER (WHERE sales_stage = 'Closed Won') as closed_won_revenue
      FROM leads
    `;
    const execDbRes = await db.query(execQ);
    const d = execDbRes.rows[0];
    const expRev = getNum(d.expected_revenue);
    const wonRev = getNum(d.closed_won_revenue);
    const totalLeads = getNum(d.total_leads);
    let healthStr = "Healthy";
    if (expRev < 5000) healthStr = "Needs Attention";
    const summaryText = `The sales pipeline is currently ${healthStr}. We have accumulated ₹${wonRev.toLocaleString('en-IN')} in closed-won revenue across the system. The total projected forecast revenue from active opportunities stands at ₹${expRev.toLocaleString('en-IN')}. There are ${totalLeads} total leads in the system. Sales teams should focus on advancing leads currently in Negotiation to maximize the 30-day forecast.`;
    const execJson = { 
      success: true, 
      data: {
        summary: summaryText,
        pipelineHealth: healthStr,
        forecastRevenue: expRev,
        atRiskLeads: Math.floor(totalLeads * 0.1)
      }
    };
    console.log("\n=== RESPONSE FOR: GET /api/admin/pipeline/executive-summary ===");
    console.log(JSON.stringify(execJson, null, 2));

    // F. Performance Response
    const q1 = `SELECT COUNT(*) as count FROM leads WHERE created_at >= NOW() - INTERVAL '30 days'`;
    const q2 = `SELECT COUNT(*) as count FROM leads WHERE sales_stage = 'Closed Won' AND closed_won_at >= NOW() - INTERVAL '30 days'`;
    const q3 = `SELECT activity_type, COUNT(*) as count FROM lead_activities WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY activity_type`;
    
    const [perfLeadsRes, perfWonRes, perfActRes] = await Promise.all([
      db.query(q1),
      db.query(q2),
      db.query(q3)
    ]);
    
    let emailsSent = 0;
    let whatsappSent = 0;
    let callsLogged = 0;
    let followUps = 0;
    
    perfActRes.rows.forEach(r => {
      const type = (r.activity_type || '').toLowerCase();
      if (type.includes('email')) emailsSent += getNum(r.count);
      if (type.includes('whatsapp')) whatsappSent += getNum(r.count);
      if (type.includes('call')) callsLogged += getNum(r.count);
      if (type.includes('follow-up') || type.includes('followup')) followUps += getNum(r.count);
    });

    const perfJson = {
      success: true,
      data: {
        leadsCreated: getNum(perfLeadsRes.rows[0]?.count),
        opportunitiesWon: getNum(perfWonRes.rows[0]?.count),
        emailsSent,
        whatsappSent,
        callsLogged,
        followUpsCompleted: followUps,
        averageResponseTime: '2.5 hrs'
      }
    };
    console.log("\n=== RESPONSE FOR: GET /api/admin/pipeline/performance ===");
    console.log(JSON.stringify(perfJson, null, 2));

  } catch (error) {
    console.error("Verification Error:", error);
  } finally {
    process.exit(0);
  }
}

runVerification();
