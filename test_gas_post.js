const https = require('https');

const payloadStr = JSON.stringify({
  event_type: "page_view",
  page: "/gas-post-test",
  page_title: "GAS POST Test",
  session_id: "GAS-POST-TEST",
  visitor_id: "GAS-POST-VISITOR",
  timestamp: new Date().toISOString()
});

const TARGET_URL = 'https://script.google.com/macros/s/AKfycbzppVr73fwe1yspAfDMnQvW3Dm4wTWda_ABJiwdsxyq1gp9-Z4_Qb_EYbBqiYxYsyJ7/exec';

function makeRequest(url, method, payload, followRedirects = false) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': payload ? Buffer.byteLength(payload) : 0
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (followRedirects && res.statusCode === 302 && res.headers.location) {
          console.log(`[Redirect] Following 302 to: ${res.headers.location}`);
          makeRequest(res.headers.location, 'GET', null, false) // GAS redirects usually expect GET to the sandbox
            .then(resolve)
            .catch(reject);
        } else {
          resolve({ status: res.statusCode, location: res.headers.location, body });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log("=== 1. POST without following redirect ===");
  try {
    const res1 = await makeRequest(TARGET_URL, 'POST', payloadStr, false);
    console.log(`STATUS: ${res1.status}`);
    console.log(`LOCATION: ${res1.location || 'None'}`);
    console.log(`BODY: ${res1.body}`);
  } catch (e) {
    console.error("Error:", e);
  }

  console.log("\n=== 2. POST following the 302 redirect ===");
  try {
    const res2 = await makeRequest(TARGET_URL, 'POST', payloadStr, true);
    console.log(`FINAL STATUS: ${res2.status}`);
    console.log(`FINAL LOCATION: ${res2.location || 'None'}`);
    console.log(`FINAL BODY: ${res2.body}`);
  } catch (e) {
    console.error("Error:", e);
  }
}

runTests();
