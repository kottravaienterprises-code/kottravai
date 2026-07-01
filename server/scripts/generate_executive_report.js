const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { extractAllData } = require('./pdf_data_extractor');
const { generateHTML } = require('./pdf_html_builder');

async function main() {
  console.log("Starting Executive Report Generation...");

  // 1. Extract Data
  console.log("Step 1: Extracting live analytics data from Google Sheets...");
  const data = await extractAllData();
  console.log("Data extracted successfully.");

  // 2. Generate HTML
  console.log("Step 2: Generating HTML layout and embedding charts...");
  const html = generateHTML(data);
  
  // Save HTML to intermediate file
  const reportDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  const htmlPath = path.join(reportDir, 'Kottravai_Monthly_Business_Performance_Report.html');
  fs.writeFileSync(htmlPath, html);
  console.log(`HTML report generated at: ${htmlPath}`);

  // 3. Generate PDF via Puppeteer
  console.log("Step 3: Launching headless browser to render PDF...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Load the HTML content directly
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Add a slight delay to ensure Chart.js animations/rendering finishes
  await new Promise(resolve => setTimeout(resolve, 2000));

  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const pdfName = `Kottravai_Monthly_Business_Performance_Report_${yyyy}-${mm}.pdf`;
  const pdfPath = path.join(reportDir, pdfName);

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: false // We built headers into the HTML pages directly
  });

  await browser.close();
  console.log(`PDF report successfully generated at: ${pdfPath}`);
  console.log("Process complete.");
}

main().catch(err => {
  console.error("Failed to generate report:", err);
  process.exit(1);
});
