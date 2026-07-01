const fs = require('fs');
let code = fs.readFileSync('server/services/googleSheetsService.js', 'utf8');

// 1. Add Indian Rupee formatting to googleSheetsService.js
// I need to find where the batch updates are constructed for formatting.
// Usually near the end of buildDashboardSheets: `const formattingRequests = [`

const formatStart = `  const formattingRequests = [`;
const formatBlock = `
    // Product Analytics Monetary Columns Format
    {
      repeatCell: {
        range: { sheetId: getSheetId(PRODUCT_ANALYTICS_SHEET), startRowIndex: 12, startColumnIndex: 2 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"₹"#,##0.00' } } },
        fields: 'userEnteredFormat.numberFormat'
      }
    },
    {
      repeatCell: {
        range: { sheetId: getSheetId(PRODUCT_ANALYTICS_SHEET), startRowIndex: 12, startColumnIndex: 4 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"₹"#,##0.00' } } },
        fields: 'userEnteredFormat.numberFormat'
      }
    },
    {
      repeatCell: {
        range: { sheetId: getSheetId(PRODUCT_ANALYTICS_SHEET), startRowIndex: 12, startColumnIndex: 6 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"₹"#,##0.00' } } },
        fields: 'userEnteredFormat.numberFormat'
      }
    },
    {
      repeatCell: {
        range: { sheetId: getSheetId(PRODUCT_ANALYTICS_SHEET), startRowIndex: 12, startColumnIndex: 8 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"₹"#,##0.00' } } },
        fields: 'userEnteredFormat.numberFormat'
      }
    },
    {
      repeatCell: {
        range: { sheetId: getSheetId(PRODUCT_ANALYTICS_SHEET), startRowIndex: 12, startColumnIndex: 10 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"₹"#,##0.00' } } },
        fields: 'userEnteredFormat.numberFormat'
      }
    },
    {
      repeatCell: {
        range: { sheetId: getSheetId(PRODUCT_ANALYTICS_SHEET), startRowIndex: 12, startColumnIndex: 12 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"₹"#,##0.00' } } },
        fields: 'userEnteredFormat.numberFormat'
      }
    },
    {
      repeatCell: {
        range: { sheetId: getSheetId(PRODUCT_ANALYTICS_SHEET), startRowIndex: 12, startColumnIndex: 14 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"₹"#,##0.00' } } },
        fields: 'userEnteredFormat.numberFormat'
      }
    },
    {
      repeatCell: {
        range: { sheetId: getSheetId(PRODUCT_ANALYTICS_SHEET), startRowIndex: 12, startColumnIndex: 16 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"₹"#,##0.00' } } },
        fields: 'userEnteredFormat.numberFormat'
      }
    },
    // Conditional Formatting: Highest Revenue (Green)
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId: getSheetId(PRODUCT_ANALYTICS_SHEET), startRowIndex: 12, startColumnIndex: 16, endColumnIndex: 17 }],
          booleanRule: {
            condition: { type: 'NUMBER_EQ', values: [{ userEnteredValue: \`=MAX($Q$13:$Q$1000)\` }] },
            format: { backgroundColor: { red: 0.8, green: 1.0, blue: 0.8 } }
          }
        },
        index: 0
      }
    },
    // Conditional Formatting: Lowest Revenue (Red)
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId: getSheetId(PRODUCT_ANALYTICS_SHEET), startRowIndex: 12, startColumnIndex: 16, endColumnIndex: 17 }],
          booleanRule: {
            condition: { type: 'NUMBER_EQ', values: [{ userEnteredValue: \`=MIN($Q$13:$Q$1000)\` }] },
            format: { backgroundColor: { red: 1.0, green: 0.8, blue: 0.8 } }
          }
        },
        index: 1
      }
    },
    // Conditional Formatting: Top 10 Revenue (Gold)
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId: getSheetId(PRODUCT_ANALYTICS_SHEET), startRowIndex: 12, startColumnIndex: 16, endColumnIndex: 17 }],
          booleanRule: {
            condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: \`=RANK(Q13, $Q$13:$Q$1000) <= 10\` }] },
            format: { backgroundColor: { red: 1.0, green: 0.84, blue: 0.0 } }
          }
        },
        index: 2
      }
    },
`;

if(code.includes(formatStart)) {
  code = code.replace(formatStart, formatStart + formatBlock);
}

// 2. Add Charts to Product Analytics
const chartStart = `    // 4. Product Analytics Charts`;
const newCharts = `    // 4. Product Analytics Charts
    if (prodId !== undefined && aggregation.productRows.length > 0) {
      const pLen = Math.min(50, aggregation.productRows.length);
      // Top Products by Product View Value (Horizontal Bar)
      chartRequests.push(chartBuilder.buildBarChart(prodId, 'Top Products by Product View Value', 
          chartBuilder.createRange(prodId, 12, 12 + pLen, 1, 2), 
          [chartBuilder.createRange(prodId, 12, 12 + pLen, 4, 5)], 
          12, 22, 500, 300
       ));
      // Potential Revenue by Product (Column Chart)
      chartRequests.push(chartBuilder.buildColumnChart(prodId, 'Potential Revenue by Product', 
          chartBuilder.createRange(prodId, 12, 12 + pLen, 1, 2), 
          [chartBuilder.createRange(prodId, 12, 12 + pLen, 14, 15)], 
          12, 27, 500, 300
       ));
      // Actual Revenue by Product (Column Chart)
      chartRequests.push(chartBuilder.buildColumnChart(prodId, 'Actual Revenue by Product', 
          chartBuilder.createRange(prodId, 12, 12 + pLen, 1, 2), 
          [chartBuilder.createRange(prodId, 12, 12 + pLen, 16, 17)], 
          27, 22, 500, 300
       ));
      // Top 10 Products by Cart Value (Bar Chart)
      chartRequests.push(chartBuilder.buildBarChart(prodId, 'Top Products by Cart Value', 
          chartBuilder.createRange(prodId, 12, 12 + Math.min(10, pLen), 1, 2), 
          [chartBuilder.createRange(prodId, 12, 12 + Math.min(10, pLen), 10, 11)], 
          27, 27, 500, 300
       ));
    }`;

// Replace the existing logic
const chartRegex = /\/\/ 4\. Product Analytics Charts[\s\S]*?\/\/ 5\. Geography Analytics Charts/;
code = code.replace(chartRegex, newCharts + '\n\n    // 5. Geography Analytics Charts');

fs.writeFileSync('server/services/googleSheetsService.js', code);
console.log('Charts and formatting patched successfully!');
