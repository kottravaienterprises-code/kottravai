const https = require('https');
const TARGET_URL = 'https://script.google.com/macros/s/AKfycbzppVr73fwe1yspAfDMnQvW3Dm4wTWda_ABJiwdsxyq1gp9-Z4_Qb_EYbBqiYxYsyJ7/exec';
function makeRequest(url, method, followRedirects = false) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (followRedirects && res.statusCode === 302 && res.headers.location) {
          makeRequest(res.headers.location, 'GET', false).then(resolve).catch(reject);
        } else {
          resolve({ status: res.statusCode, location: res.headers.location, body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}
async function run() {
  const r = await makeRequest(TARGET_URL, 'GET', true);
  console.log(r.body);
}
run();
