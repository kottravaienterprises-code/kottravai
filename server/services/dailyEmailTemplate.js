const buildDailyAnalyticsEmail = (data) => {
  const b = data.blocks;
  const s7 = data.sevenDaySummary || {};
  
  // Kottravai Brand Theme
  const bgMain = '#FFFDF8';
  const primaryBrown = '#5C3B1E';
  const secondaryBrown = '#8B5E34';
  const accentGold = '#D4A373';
  const borderLight = '#EAE2D6';
  const textDark = '#333333';
  const textLight = '#666666';
  const successGreen = '#2E7D32';
  const dangerRed = '#C62828';

  const formatNum = (val) => val === undefined || val === null ? '0' : val.toLocaleString();
  const formatStr = (val) => val && val !== 'N/A' && val !== 'Unknown' ? val : 'Unknown';
  const formatCur = (val) => {
    const num = Number((val || '').toString().replace(/[^0-9.-]+/g,"")) || 0;
    return '₹' + num.toFixed(2);
  };
  const formatPct = (val) => {
    if (typeof val === 'string' && val.includes('%')) return val;
    return (val || 0).toFixed(1) + '%';
  };

  const SectionHeader = (title) => `
    <div style="margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid ${accentGold}; padding-bottom: 5px;">
      <h2 style="margin: 0; font-size: 18px; color: ${primaryBrown}; text-transform: uppercase; letter-spacing: 1px;">${title}</h2>
    </div>
  `;

  const ScorecardRow = (cards) => {
    let html = '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 15px; table-layout: fixed;"><tr>';
    cards.forEach((c, index) => {
      const padRight = index < cards.length - 1 ? '10px' : '0px';
      const valColor = c.isGreen ? successGreen : (c.isRed ? dangerRed : primaryBrown);
      html += `
        <td valign="top" style="padding-right: ${padRight}; width: ${100/cards.length}%;">
          <div style="background: #FFFFFF; border: 1px solid ${borderLight}; border-radius: 6px; padding: 15px 10px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            <div style="font-size: 10px; color: ${textLight}; text-transform: uppercase; font-weight: bold; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.label}</div>
            <div style="font-size: 18px; font-weight: bold; color: ${valColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.value}</div>
          </div>
        </td>
      `;
    });
    html += '</tr></table>';
    return html;
  };

  const DataTable = (headers, rows) => {
    let html = '<div style="background: #FFFFFF; border: 1px solid '+borderLight+'; border-radius: 6px; overflow: hidden; margin-bottom: 20px;">';
    html += '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">';
    
    // Header
    html += `<tr style="background-color: ${primaryBrown};">`;
    headers.forEach((h, index) => {
      const align = index === 0 ? 'left' : (index === headers.length - 1 ? 'right' : 'center');
      html += `<td align="${align}" style="color: #FFFFFF; font-size: 12px; font-weight: bold; padding: 12px 10px; border-bottom: 2px solid ${secondaryBrown};">${h}</td>`;
    });
    html += `</tr>`;
    
    // Rows
    if (!rows || rows.length === 0) {
      html += `<tr><td colspan="${headers.length}" align="center" style="padding: 20px; font-size: 13px; color: ${textLight}; font-style: italic; background-color: #FFFFFF;">No activity recorded for the selected period.</td></tr>`;
    } else {
      rows.forEach((row, rowIndex) => {
        const bgColor = rowIndex % 2 === 0 ? '#FFFFFF' : '#F9F8F6';
        const borderStyle = rowIndex === rows.length - 1 ? '' : `border-bottom: 1px solid ${borderLight};`;
        html += `<tr style="background-color: ${bgColor};">`;
        row.forEach((cell, cellIndex) => {
          const align = cellIndex === 0 ? 'left' : (cellIndex === row.length - 1 ? 'right' : 'center');
          const weight = cellIndex === 0 ? 'bold' : 'normal';
          html += `<td align="${align}" style="padding: 10px; font-size: 13px; color: ${textDark}; font-weight: ${weight}; ${borderStyle}">${cell}</td>`;
        });
        html += `</tr>`;
      });
    }
    html += '</table></div>';
    return html;
  };

  const ProgressBar = (value, max, color) => {
    const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
    return `
      <div style="width: 100%; max-width: 100px; background-color: #E0E0E0; border-radius: 3px; height: 12px; display: inline-block; vertical-align: middle;">
        <div style="width: ${pct}%; background-color: ${color}; height: 12px; border-radius: 3px;"></div>
      </div>
      <span style="font-size: 11px; margin-left: 5px; color: ${textLight}; vertical-align: middle;">${formatNum(value)}</span>
    `;
  };

  const formatKCur = (val) => {
    if (!val) return '₹0';
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 1000000) return sign + '₹' + (absVal / 1000000).toFixed(1) + 'M';
    if (absVal >= 1000) return sign + '₹' + (absVal / 1000).toFixed(1) + 'K';
    return sign + '₹' + absVal.toFixed(0);
  };
  
  const formatKNum = (val) => {
    if (!val) return '0';
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 1000000) return sign + (absVal / 1000000).toFixed(1) + 'M';
    if (absVal >= 1000) return sign + (absVal / 1000).toFixed(1) + 'K';
    return sign + absVal.toFixed(0);
  };

  const LineChartImage = (dataItems) => {
    if (!dataItems || dataItems.length === 0) {
      return `<div style="text-align: center; padding: 20px; font-size: 13px; color: ${textLight}; font-style: italic; background-color: #FFFFFF; border: 1px solid ${borderLight}; border-radius: 6px;">No activity recorded for the selected period.</div>`;
    }
    const labels = dataItems.map(d => {
      const dParts = d.label.split('-');
      return dParts.length === 3 ? new Date(d.label).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : d.label;
    });
    const values = dataItems.map(d => d.value);
    
    const chartConfig = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Visitors',
          data: values,
          borderColor: '#54b3b3',
          backgroundColor: '#54b3b3',
          borderWidth: 4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#54b3b3',
          pointBorderWidth: 4,
          pointRadius: 6,
          fill: false,
          tension: 0
        }]
      },
      options: {
        plugins: { legend: { display: false }, datalabels: { display: false } },
        scales: {
          x: {
            grid: { color: '#d3d3d3', drawBorder: true, lineWidth: 2, drawOnChartArea: true },
            ticks: { color: '#666666', font: { size: 13, family: 'sans-serif' }, maxRotation: 45, minRotation: 45 }
          },
          y: {
            grid: { color: '#d3d3d3', drawBorder: true, lineWidth: 2, drawOnChartArea: true },
            ticks: { color: '#666666', font: { size: 13, family: 'sans-serif' } },
            beginAtZero: true
          }
        },
        layout: { padding: 15 }
      }
    };
    
    const url = `https://quickchart.io/chart?w=500&h=300&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
    return `<div style="background: #FFFFFF; border: 1px solid ${borderLight}; border-radius: 8px; padding: 25px 20px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); text-align: center;">
      <img src="${url}" alt="7-Day Traffic Trend" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
    </div>`;
  };

  const EnhancedBarChart = (dataItems, options = {}) => {
    if (!dataItems || dataItems.length === 0) {
      return `<div style="text-align: center; padding: 20px; font-size: 13px; color: ${textLight}; font-style: italic; background-color: #FFFFFF; border: 1px solid ${borderLight}; border-radius: 6px;">No activity recorded for the selected period.</div>`;
    }

    const {
      colorMain = '#8B5E34',
      colorHighlight = '#D4A373',
      showSummary = true,
      valueFormatter = formatKCur
    } = options;

    const maxVal = Math.max(...dataItems.map(d => d.value), 1);
    const n = dataItems.length;
    
    // Calculate Growth
    let growthHtml = '';
    if (n >= 2) {
      const todayVal = dataItems[n - 1].value;
      const yestVal = dataItems[n - 2].value;
      const diff = todayVal - yestVal;
      const pct = yestVal > 0 ? (diff / yestVal) * 100 : (todayVal > 0 ? 100 : 0);
      
      const arrow = diff >= 0 ? '↑' : '↓';
      const signStr = diff >= 0 ? '+' : '';
      const color = diff >= 0 ? successGreen : dangerRed;
      
      growthHtml = `
        <div style="margin-bottom: 20px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: ${textDark}; margin-bottom: 5px;">
            <span style="color: ${color};">${arrow} ${signStr}${pct.toFixed(1)}%</span>
            <span style="font-size: 14px; color: ${textLight}; font-weight: normal; vertical-align: middle;">vs Yesterday</span>
          </div>
          <div style="font-size: 12px; color: ${textLight}; background-color: #F9F8F6; display: inline-block; padding: 6px 12px; border-radius: 4px;">
            <strong>Yesterday:</strong> ${valueFormatter(yestVal)} &nbsp;|&nbsp; <strong>Report Day:</strong> ${valueFormatter(todayVal)} &nbsp;|&nbsp; <strong>Diff:</strong> ${diff > 0 ? '+' : ''}${valueFormatter(diff)}
          </div>
        </div>
      `;
    }

    // Chart HTML
    let chartHtml = `<div style="overflow-x: auto; padding-bottom: 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout: fixed; min-width: 350px;">
        <tr>`;
        
    dataItems.forEach((d, idx) => {
      const heightPx = maxVal > 0 ? Math.round((d.value / maxVal) * 120) : 0; // max height 120px
      const displayHeight = Math.max(heightPx, 2);
      const isLast = idx === n - 1;
      const barColor = isLast ? colorHighlight : colorMain;
      
      chartHtml += `
        <td valign="bottom" align="center" style="padding: 0 4px; width: ${100 / n}%;">
          <div style="font-size: 11px; color: ${textDark}; font-weight: bold; margin-bottom: 6px; word-break: break-all;">${valueFormatter(d.value)}</div>
          <div style="background-color: ${barColor}; width: 100%; max-width: 45px; height: ${displayHeight}px; margin: 0 auto; border-radius: 4px 4px 0 0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);"></div>
        </td>
      `;
    });

    chartHtml += `</tr><tr>`;

    dataItems.forEach(d => {
      let shortDate = d.label;
      let isWeekend = false;
      const dateParts = d.label.split('-');
      if (dateParts.length === 3) {
        const dObj = new Date(d.label);
        const dayOfWeek = dObj.getDay(); // 0 = Sunday, 6 = Saturday
        isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        shortDate = dObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      }
      
      const bgColor = isWeekend ? '#F5EBE1' : 'transparent';
      const textColor = isWeekend ? '#8B5E34' : textLight;
      const fontWeight = isWeekend ? 'bold' : 'normal';
      
      chartHtml += `
        <td align="center" style="padding-top: 10px; font-size: 11px; color: ${textColor}; border-top: 1px solid ${borderLight};">
          <div style="background-color: ${bgColor}; padding: 4px 2px; border-radius: 4px; font-weight: ${fontWeight}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${shortDate}
          </div>
        </td>
      `;
    });

    chartHtml += `</tr></table></div>`;

    // Summary HTML
    let summaryHtml = '';
    if (showSummary && n > 0) {
      const total = dataItems.reduce((sum, d) => sum + d.value, 0);
      const avg = total / n;
      const highest = Math.max(...dataItems.map(d => d.value));
      const lowest = Math.min(...dataItems.map(d => d.value));
      
      summaryHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px; border-top: 1px dashed ${borderLight}; padding-top: 15px;">
          <tr>
            <td align="center" style="width: 25%; font-size: 11px;">
              <div style="color: ${textLight}; margin-bottom: 4px; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px;">7-Day Total</div>
              <div style="font-weight: bold; color: ${textDark}; font-size: 14px;">${valueFormatter(total)}</div>
            </td>
            <td align="center" style="width: 25%; font-size: 11px; border-left: 1px solid ${borderLight};">
              <div style="color: ${textLight}; margin-bottom: 4px; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px;">Daily Avg</div>
              <div style="font-weight: bold; color: ${textDark}; font-size: 14px;">${valueFormatter(avg)}</div>
            </td>
            <td align="center" style="width: 25%; font-size: 11px; border-left: 1px solid ${borderLight};">
              <div style="color: ${textLight}; margin-bottom: 4px; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px;">Highest Day</div>
              <div style="font-weight: bold; color: ${successGreen}; font-size: 14px;">${valueFormatter(highest)}</div>
            </td>
            <td align="center" style="width: 25%; font-size: 11px; border-left: 1px solid ${borderLight};">
              <div style="color: ${textLight}; margin-bottom: 4px; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px;">Lowest Day</div>
              <div style="font-weight: bold; color: ${dangerRed}; font-size: 14px;">${valueFormatter(lowest)}</div>
            </td>
          </tr>
        </table>
      `;
    }

    return `<div style="background: #FFFFFF; border: 1px solid ${borderLight}; border-radius: 8px; padding: 25px 20px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
      ${growthHtml}
      ${chartHtml}
      ${summaryHtml}
    </div>`;
  };

  const topProductName = b.productInsights.mostViewedProduct !== 'N/A' ? b.productInsights.mostViewedProduct : 'None';
  
  // Max values for progress bars
  const maxTraffic = Math.max(...(s7.trafficTrend || []).map(t => t.visitors), 1);
  const maxRevenue = Math.max(...(s7.revenueTrend || []).map(t => t.revenue), 1);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F4F4F4; margin: 0; padding: 0; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #F4F4F4; padding: 20px 0; }
        .main { background-color: ${bgMain}; margin: 0 auto; width: 100%; max-width: 640px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
        .content { padding: 30px; }
        @media only screen and (max-width: 600px) {
          .content { padding: 15px; }
          .hide-mobile { display: none !important; }
        }
      </style>
    </head>
    <body>
      <center class="wrapper">
        <table class="main" width="100%" cellpadding="0" cellspacing="0" border="0" align="center">
          
          <!-- HEADER -->
          <tr>
            <td style="background-color: ${primaryBrown}; padding: 35px 20px; text-align: center; border-bottom: 4px solid ${accentGold};">
              <h1 style="margin: 0 0 5px 0; color: #FFFFFF; font-size: 24px; font-weight: bold; letter-spacing: 1px;">
                EXECUTIVE MORNING BRIEF
              </h1>
              <div style="color: ${accentGold}; font-size: 14px; font-weight: bold; text-transform: uppercase;">
                ${data.date}
              </div>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td class="content">
              
              <!-- EXECUTIVE SCORECARDS -->
              ${ScorecardRow([
                { label: "Today's Visitors", value: formatNum(s7.todayVisitors) },
                { label: "Today's Orders", value: formatNum(data.summary.totalOrders) },
                { label: "Today's Revenue", value: formatCur(data.summary.totalRevenue), isGreen: true },
                { label: "Conversion Rate", value: formatPct(data.summary.overallConversionRate * 100) }
              ])}
              
              ${ScorecardRow([
                { label: "7-Day Growth", value: (s7.weeklyGrowthRevenue > 0 ? '+' : '') + formatPct(s7.weeklyGrowthRevenue), isGreen: s7.weeklyGrowthRevenue > 0, isRed: s7.weeklyGrowthRevenue < 0 },
                { label: "Recoverable Rev", value: b.revenueInsights.revenueOpportunity },
                { label: "Top Platform", value: formatStr(b.visitorInsights.topTrafficSource) },
                { label: "Top Product", value: formatStr(topProductName.substring(0, 15)) }
              ])}



              <!-- 7-DAY TRAFFIC TREND -->
              ${SectionHeader('7-Day Traffic Trend')}
              ${LineChartImage(
                (s7.trafficTrend || []).map(t => ({ label: t.date, value: t.visitors }))
              )}

              <!-- 7-DAY REVENUE TREND -->
              ${SectionHeader('7-Day Revenue Trend')}
              ${EnhancedBarChart(
                (s7.revenueTrend || []).map(r => ({ label: r.date, value: r.revenue })),
                { colorMain: secondaryBrown, colorHighlight: accentGold, showSummary: true, valueFormatter: formatKCur }
              )}

              <!-- TRAFFIC SOURCE SUMMARY -->
              ${SectionHeader('Traffic Source Summary')}
              ${DataTable(
                ['Source', 'Visitors', 'Orders', 'Revenue', 'Conv. Rate'],
                (s7.trafficSourceSummary || []).map(s => [
                  formatStr(s.source),
                  formatNum(s.visitors),
                  formatNum(s.orders),
                  formatCur(s.revenue),
                  formatPct(s.conversionRate)
                ])
              )}

              <!-- TOP PRODUCTS -->
              ${SectionHeader('Top 10 Products')}
              ${DataTable(
                ['Product', 'Views', 'Added', 'Purchased', 'Revenue', 'Conv %'],
                (s7.topProducts || []).map(p => {
                  const pName = p.product || 'Unknown Product';
                  return [
                    formatStr(pName.substring(0, 25) + (pName.length > 25 ? '...' : '')),
                  formatNum(p.views),
                  formatNum(p.addToCarts),
                  formatNum(p.purchases),
                  formatCur(p.revenue),
                  formatPct(p.conversionRate)
                ];
                })
              )}

              <!-- TOP GEOGRAPHIES -->
              ${SectionHeader('Geography Summary')}
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td width="48%" valign="top">
                    <div style="font-size: 14px; font-weight: bold; color: ${primaryBrown}; margin-bottom: 10px;">Top States</div>
                    ${DataTable(
                      ['State', 'Visitors'],
                      (s7.geographySummary?.states || []).map(s => [formatStr(s.state), formatNum(s.visitors)])
                    )}
                  </td>
                  <td width="4%"></td>
                  <td width="48%" valign="top">
                    <div style="font-size: 14px; font-weight: bold; color: ${primaryBrown}; margin-bottom: 10px;">Top Cities</div>
                    ${DataTable(
                      ['City', 'Visitors'],
                      (s7.geographySummary?.cities || []).map(c => [formatStr(c.city), formatNum(c.visitors)])
                    )}
                  </td>
                </tr>
              </table>



            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #EBE6DF; text-align: center; padding: 20px; font-size: 11px; color: ${textLight}; border-top: 1px solid ${borderLight};">
              <strong>Automated Daily Reporting System • Kottravai Analytics</strong><br>
              <span style="opacity: 0.8;">This executive brief was generated dynamically from your Raw Events data.</span>
            </td>
          </tr>

        </table>
      </center>
    </body>
    </html>
  `;
};

module.exports = { buildDailyAnalyticsEmail };
