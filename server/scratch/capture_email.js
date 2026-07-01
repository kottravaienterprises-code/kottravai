const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const filePath = 'file://' + path.join(__dirname, 'test_email_output.html');
  console.log('Loading', filePath);
  await page.goto(filePath, { waitUntil: 'networkidle0' });
  await page.setViewport({ width: 700, height: 1600 });
  const outPath = path.join(__dirname, 'email_preview.png');
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Screenshot saved to', outPath);
  await browser.close();
})();
