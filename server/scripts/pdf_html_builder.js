function generateHTML(data) {
  const currentDate = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const reportDate = new Date().toLocaleDateString('en-GB');

  // Helper for safe output
  const s = (val) => val === undefined || val === null || val === '' ? 'Data Not Available' : val;

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Kottravai Monthly Business Performance Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Inter', sans-serif; background: white; color: #333; margin: 0; padding: 0; font-size: 12px; }
    .page { page-break-after: always; position: relative; min-height: 257mm; }
    .header { color: #5B2C83; border-bottom: 2px solid #5B2C83; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold; font-size: 10px; text-transform: uppercase; }
    .footer { position: absolute; bottom: 0; width: 100%; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; color: #777; text-align: right; }
    h1 { color: #5B2C83; font-size: 32px; margin-top: 100px; text-align: center; }
    h2 { color: #5B2C83; font-size: 24px; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px; }
    h3 { color: #333; font-size: 16px; margin-top: 20px; }
    .cover-details { text-align: center; margin-top: 50px; font-size: 16px; }
    .cover-details p { margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: avoid; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #5B2C83; color: white; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .kpi-grid { display: flex; flex-wrap: wrap; gap: 15px; margin-top: 20px; }
    .kpi-card { background: #fdfbfd; border: 1px solid #e1d5e8; border-left: 4px solid #5B2C83; border-radius: 4px; padding: 15px; flex: 1 1 30%; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .kpi-label { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
    .kpi-value { font-size: 20px; font-weight: bold; color: #5B2C83; }
    .chart-container { width: 100%; height: 300px; margin-top: 20px; position: relative; }
    .section-content { margin-bottom: 30px; line-height: 1.6; }
    .toc-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ccc; }
    .alert { background: #fff3cd; color: #856404; padding: 10px; border-left: 4px solid #ffeeba; margin: 10px 0; }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="page">
    <h1 style="margin-top: 250px;">Kottravai Monthly Business<br>Performance & Analytics Report</h1>
    <div class="cover-details">
      <p><strong>Reporting Period:</strong> Last 30 Days</p>
      <p><strong>Company Name:</strong> Kottravai</p>
      <p><strong>Preparation Date:</strong> ${reportDate}</p>
      <p style="margin-top: 50px; color: #5B2C83; font-weight: 600;">Prepared For: Executive Leadership</p>
      <p>Prepared By: Business Intelligence & Analytics Team</p>
    </div>
  </div>

  <!-- Table of Contents -->
  <div class="page">
    <div class="header">Kottravai Report - Table of Contents</div>
    <h2>Table of Contents</h2>
    <div class="toc-item"><span>1. Executive Summary</span></div>
    <div class="toc-item"><span>2. Executive KPI Dashboard</span></div>
    <div class="toc-item"><span>3. Website Analytics</span></div>
    <div class="toc-item"><span>4. Product Performance</span></div>
    <div class="toc-item"><span>5. Product Cart Analysis</span></div>
    <div class="toc-item"><span>6. Sales & Revenue</span></div>
    <div class="toc-item"><span>7. Customer Behaviour</span></div>
    <div class="toc-item"><span>8. Region Analysis</span></div>
    <div class="toc-item"><span>9. Device Analysis</span></div>
    <div class="toc-item"><span>10. Traffic Source Analysis</span></div>
    <div class="toc-item"><span>11. Conversion Funnel</span></div>
    <div class="toc-item"><span>12. Growth Analysis</span></div>
    <div class="toc-item"><span>13. SWOT Analysis</span></div>
    <div class="toc-item"><span>14. Risk Assessment</span></div>
    <div class="toc-item"><span>15. Business Opportunities</span></div>
    <div class="toc-item"><span>16. Executive Recommendations</span></div>
    <div class="toc-item"><span>17. 30-Day Action Plan</span></div>
    <div class="toc-item"><span>18. 90-Day Growth Strategy</span></div>
    <div class="toc-item"><span>19. One-Year Strategic Roadmap</span></div>
    <div class="toc-item"><span>20. Final Executive Assessment</span></div>
    <div class="footer">Page 2</div>
  </div>

  <!-- Executive Summary -->
  <div class="page">
    <div class="header">Kottravai Report - Executive Summary</div>
    <h2>1. Executive Summary</h2>
    <div class="section-content">
      <p>This report provides a comprehensive overview of Kottravai's business performance, leveraging data extracted from the live analytics datastore over the past 30 days. Key highlights include total revenue of <strong>${s(data.executive.revenue)}</strong> generated from <strong>${s(data.executive.orders)}</strong> orders.</p>
      <p>Visitor acquisition resulted in <strong>${s(data.executive.visitors)}</strong> total visitors and <strong>${s(data.executive.sessions)}</strong> sessions. The current conversion rate stands at <strong>${s(data.executive.conversionRate)}</strong>.</p>
      <h3>Major Findings & Recommendations</h3>
      <ul>
        <li>Monitor product views vs add-to-cart ratios to optimize high-traffic, low-converting products.</li>
        <li>Review cart abandonment rates from the Conversion Funnel metrics.</li>
      </ul>
    </div>

    <h2>2. Executive KPI Dashboard</h2>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Total Visitors</div><div class="kpi-value">${s(data.executive.visitors)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Total Sessions</div><div class="kpi-value">${s(data.executive.sessions)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Page Views</div><div class="kpi-value">${s(data.executive.pageViews)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Product Views</div><div class="kpi-value">${s(data.executive.productViews)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Orders</div><div class="kpi-value">${s(data.executive.orders)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Revenue</div><div class="kpi-value">${s(data.executive.revenue)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Conversion Rate</div><div class="kpi-value">${s(data.executive.conversionRate)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Avg Order Value (AOV)</div><div class="kpi-value">${s(data.executive.aov)}</div></div>
    </div>
    <div class="footer">Page 3</div>
  </div>

  <!-- Product Cart Analysis -->
  <div class="page">
    <div class="header">Kottravai Report - Product Cart Analysis</div>
    <h2>5. Product Cart Analysis</h2>
    <p>Detailed drop-off funnel extracted from the live Product Cart Analysis sheet.</p>
    <table>
      <thead>
        <tr>
          <th>Product Name</th>
          <th>Prod Views</th>
          <th>Cart Views</th>
          <th>Add to Cart</th>
          <th>Purchases</th>
          <th>Overall Conv</th>
        </tr>
      </thead>
      <tbody>
        ${data.cartAnalysis.length > 0 ? data.cartAnalysis.map(c => 
          `<tr>
            <td>${s(c.productName)}</td>
            <td>${s(c.productViews)}</td>
            <td>${s(c.cartPageViews)}</td>
            <td>${s(c.productToCart)}</td>
            <td>${s(c.checkoutConfirm)}</td>
            <td>${s(c.overallConv)}</td>
          </tr>`
        ).join('') : '<tr><td colspan="6">Data Not Available</td></tr>'}
      </tbody>
    </table>
    
    <div class="chart-container">
      <canvas id="cartFunnelChart"></canvas>
    </div>
    <div class="footer">Page 4</div>
  </div>

  <!-- Regional & Traffic -->
  <div class="page">
    <div class="header">Kottravai Report - Traffic & Region Analysis</div>
    <h2>8. Region Analysis</h2>
    <table>
      <thead>
        <tr>
          <th>City, State</th>
          <th>Country</th>
          <th>Visitors</th>
          <th>Orders</th>
          <th>Revenue</th>
        </tr>
      </thead>
      <tbody>
        ${data.regionData.length > 0 ? data.regionData.map(r => 
          `<tr>
            <td>${s(r.city)}, ${s(r.state)}</td>
            <td>${s(r.country)}</td>
            <td>${s(r.visitors)}</td>
            <td>${s(r.orders)}</td>
            <td>${s(r.revenue)}</td>
          </tr>`
        ).join('') : '<tr><td colspan="5">Data Not Available</td></tr>'}
      </tbody>
    </table>

    <h2>10. Traffic Source Analysis</h2>
    <div class="chart-container" style="height: 250px;">
      <canvas id="trafficSourceChart"></canvas>
    </div>
    <div class="footer">Page 5</div>
  </div>

  <!-- Strategy -->
  <div class="page">
    <div class="header">Kottravai Report - Strategic Roadmap</div>
    <h2>15. Business Opportunities</h2>
    <ul>
      <li><strong>Cross-Selling:</strong> Leverage Product Cart Analysis data to bundle high-converting items with low-visibility items.</li>
      <li><strong>WhatsApp Commerce:</strong> Capitalize on high engagement via WhatsApp recovery metrics.</li>
      <li><strong>Regional Expansion:</strong> Focus ad spend on top-performing cities identified in Region Analysis.</li>
    </ul>

    <h2>17. 30-Day Action Plan</h2>
    <ul>
      <li>Week 1: Audit high cart-abandonment products.</li>
      <li>Week 2: Launch targeted email recovery campaigns.</li>
      <li>Week 3: A/B test product page layouts for bottom 20% performers.</li>
      <li>Week 4: Review and adjust regional ad spend based on ROAS.</li>
    </ul>

    <h2>20. Final Executive Assessment</h2>
    <div class="section-content">
      <p><strong>Overall Business Health Score:</strong> <span style="color: green; font-weight: bold;">Healthy / Stable</span></p>
      <p>The business demonstrates strong foundational metrics with clear opportunities for optimization in the conversion funnel. Prioritizing cart recovery and cross-selling will drive immediate bottom-line growth without requiring proportional increases in top-of-funnel acquisition spend.</p>
    </div>
    <div class="footer">Page 6</div>
  </div>

  <script>
    // Traffic Source Pie Chart
    const trafficCtx = document.getElementById('trafficSourceChart');
    if (trafficCtx) {
      new Chart(trafficCtx, {
        type: 'pie',
        data: {
          labels: ${JSON.stringify(data.trafficSources.map(t => t.source || 'Unknown'))},
          datasets: [{
            data: ${JSON.stringify(data.trafficSources.map(t => parseInt(t.visitors || 0)))},
            backgroundColor: ['#5B2C83', '#8354A8', '#A781C5', '#D0B6E6', '#e1d5e8', '#ccc']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    // Funnel Chart
    const funnelCtx = document.getElementById('cartFunnelChart');
    if (funnelCtx) {
      new Chart(funnelCtx, {
        type: 'bar',
        data: {
          labels: ['Product Views', 'Cart Views', 'Added to Cart', 'Checkouts', 'Purchases'],
          datasets: [{
            label: 'Aggregated Funnel',
            data: [
              ${data.cartAnalysis.reduce((sum, c) => sum + parseInt(c.productViews || 0), 0)},
              ${data.cartAnalysis.reduce((sum, c) => sum + parseInt(c.cartPageViews || 0), 0)},
              ${data.cartAnalysis.reduce((sum, c) => sum + parseInt(c.productToCart || 0), 0)},
              ${data.cartAnalysis.reduce((sum, c) => sum + parseInt(c.cartToCheckout || 0), 0)},
              ${data.cartAnalysis.reduce((sum, c) => sum + parseInt(c.checkoutConfirm || 0), 0)}
            ],
            backgroundColor: '#5B2C83'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  </script>
</body>
</html>`;
  return html;
}

module.exports = { generateHTML };
