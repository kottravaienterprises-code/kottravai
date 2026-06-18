const buildWeeklyAnalyticsEmail = (data) => {
  const b = data.blocks;
  
  // Colors from the new design
  const darkBrown = '#543922';
  const lightBrown = '#A87C4F';
  const beigeCard = '#F9F6F0';
  const borderLight = '#EAE2D6';
  const textDark = '#543922';
  const textLight = '#8C7A6B';
  const greenText = '#6D9F3E';

  const SectionHeader = (title, emoji = '') => `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 25px; margin-bottom: 10px;">
      <tr>
        <td style="padding-bottom: 5px; border-bottom: 2px solid ${lightBrown}; font-size: 14px; font-weight: bold; color: ${lightBrown}; text-transform: capitalize;">
          ${emoji ? emoji + ' ' : ''}${title}
        </td>
      </tr>
    </table>
  `;

  const ThreeCardRow = (cards) => {
    let html = '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 10px;"><tr>';
    cards.forEach((c, index) => {
      const paddingStyle = index === 0 ? 'padding-right: 5px;' : index === 1 ? 'padding-left: 5px; padding-right: 5px;' : 'padding-left: 5px;';
      const valColor = c.isGreen ? greenText : textDark;
      html += `
        <td width="33.33%" valign="top" style="${paddingStyle}">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid ${borderLight}; border-radius: 2px; text-align: center;">
            <tr>
              <td style="padding: 15px 10px;">
                <div style="font-size: 9px; color: ${textLight}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">${c.label}</div>
                <div style="font-size: 16px; font-weight: bold; color: ${valColor};">${c.value}</div>
              </td>
            </tr>
          </table>
        </td>
      `;
    });
    html += '</tr></table>';
    return html;
  };

  const DataTable = (headers, rows) => {
    let html = '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 15px;">';
    // Header
    html += `<tr>`;
    headers.forEach((h, index) => {
      const align = index === headers.length - 1 ? 'right' : 'left';
      html += `<td align="${align}" style="background-color: ${darkBrown}; color: #FFFFFF; font-size: 11px; font-weight: bold; padding: 10px; border-bottom: 2px solid #FFFFFF;">${h}</td>`;
    });
    html += `</tr>`;
    
    // Rows
    rows.forEach((row, rowIndex) => {
      const borderStyle = rowIndex === rows.length - 1 ? '' : `border-bottom: 1px solid ${borderLight};`;
      html += `<tr>`;
      row.forEach((cell, cellIndex) => {
        const align = cellIndex === row.length - 1 ? 'right' : 'left';
        const weight = cellIndex === 0 ? 'bold' : 'normal';
        html += `<td align="${align}" style="padding: 10px; font-size: 12px; color: ${textDark}; font-weight: ${weight}; ${borderStyle}">${cell}</td>`;
      });
      html += `</tr>`;
    });
    html += '</table>';
    return html;
  };

  const formatNum = (val) => val === undefined || val === null ? '0' : val.toString();
  const formatStr = (val) => val && val !== 'N/A' && val !== 'Unknown' ? val : 'Unknown';

  const topProductName = b.productInsights.mostViewedProduct !== 'N/A' ? b.productInsights.mostViewedProduct : 'None';
  const topProductViews = b.productInsights.topProductViews || 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; background-color: #F4F4F4; margin: 0; padding: 0; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #F4F4F4; padding-top: 20px; padding-bottom: 20px; }
        .main { background-color: #FFFFFF; margin: 0 auto; width: 100%; max-width: 600px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
      </style>
    </head>
    <body>
      <center class="wrapper">
        <table class="main" width="100%" cellpadding="0" cellspacing="0" border="0" align="center">
          
          <!-- HEADER -->
          <tr>
            <td style="background-color: ${darkBrown}; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; color: #FFFFFF; font-size: 22px; font-weight: bold;">
                <span style="font-size: 20px; vertical-align: middle;">📅</span> Weekly Analytics Report
              </h1>
              <div style="color: #FFFFFF; font-size: 12px; opacity: 0.9;">
                ${data.dateRange}
              </div>
            </td>
          </tr>

          <!-- BODY PADDING -->
          <tr>
            <td style="padding: 20px 30px;">
              
              <!-- KEY INSIGHTS -->
              ${SectionHeader('Weekly Insights')}
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${beigeCard}; border-left: 4px solid ${lightBrown}; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 15px 20px; font-size: 12px; color: ${textDark}; line-height: 1.6;">
                    <ul style="margin: 0; padding-left: 15px;">
                      <li style="margin-bottom: 8px;"><strong>${topProductName.substring(0, 30)}${topProductName.length > 30 ? '...' : ''}</strong> was the most viewed product this week with ${topProductViews} views.</li>
                      <li>You received <strong>${b.orderInsights.totalOrders}</strong> orders, generating <strong>${b.revenueInsights.weeklyRevenue}</strong> in revenue!</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- REVENUE SUMMARY -->
              ${SectionHeader('Revenue Summary')}
              ${ThreeCardRow([
                { label: 'WEEKLY REV', value: b.revenueInsights.weeklyRevenue, isGreen: true },
                { label: 'ORDERS', value: formatNum(b.orderInsights.totalOrders) },
                { label: 'AOV', value: b.orderInsights.averageOrderValue }
              ])}

              <!-- TRAFFIC SUMMARY -->
              ${SectionHeader('Traffic Summary')}
              ${ThreeCardRow([
                { label: 'NEW VISITORS', value: formatNum(b.visitorInsights.newVisitors) },
                { label: 'REPEAT VISITORS', value: formatNum(b.visitorInsights.repeatVisitors) },
                { label: 'SESSIONS', value: formatNum(b.visitorInsights.sessions || b.visitorInsights.totalVisitors) }
              ])}

              <!-- GEOGRAPHY SUMMARY -->
              ${SectionHeader('Geography Summary', '🌍')}
              ${ThreeCardRow([
                { label: 'TOP COUNTRY', value: formatStr(b.geographyInsights.topCountry) },
                { label: 'TOP STATE', value: formatStr(b.geographyInsights.topState) },
                { label: 'TOP CITY', value: formatStr(b.geographyInsights.topCity) }
              ])}

              <!-- ENGAGEMENT METRICS -->
              ${SectionHeader('Engagement Metrics')}
              ${ThreeCardRow([
                { label: 'PRODUCT VIEWS', value: formatNum(b.productInsights.productViews) },
                { label: 'ADD TO CARTS', value: formatNum(b.productInsights.addToCarts) },
                { label: 'CONVERSION', value: b.orderInsights.conversionRate }
              ])}

              <!-- TOP PERFORMANCE -->
              ${SectionHeader('Top Performance')}
              ${DataTable(
                ['Metric', 'Item', 'Views'],
                [
                  ['Top Product', topProductName.substring(0, 40) + (topProductName.length > 40 ? '...' : ''), formatNum(topProductViews)],
                  ['Top Page', b.productInsights.topPage && b.productInsights.topPage !== 'N/A' ? b.productInsights.topPage.substring(0, 40) + '...' : 'None', formatNum(b.productInsights.topPageViews || 0)]
                ]
              )}

              <!-- TRAFFIC SOURCES -->
              ${SectionHeader('Traffic Sources')}
              ${DataTable(
                ['Source', 'Events'],
                (b.trafficSourcesTable && b.trafficSourcesTable.length > 0) 
                  ? b.trafficSourcesTable.map(s => [s.source.substring(0, 40), formatNum(s.events)])
                  : [['Direct', '0']]
              )}

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="text-align: center; padding: 20px; font-size: 10px; color: ${textLight}; border-top: 1px solid ${borderLight};">
              Automated Weekly Reporting System • Kottravai Analytics<br>
              This email was generated from your Raw Events Google Sheet data.
            </td>
          </tr>

        </table>
      </center>
    </body>
    </html>
  `;
};

module.exports = { buildWeeklyAnalyticsEmail };
