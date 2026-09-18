require('dotenv').config({path: 'server/.env'});
const { google } = require('googleapis');

async function diagnose() {
  console.log("=== DIAGNOSTIC SCRIPT ===");
  const email = process.env.GOOGLE_CLIENT_EMAIL || '';
  console.log("Service Account Email:", email);
  
  // Extract project ID from email
  // format: account-name@project-id.iam.gserviceaccount.com
  const match = email.match(/@(.+)\.iam\.gserviceaccount\.com/);
  let projectId = match ? match[1] : 'UNKNOWN';
  console.log("Inferred Project ID from email:", projectId);

  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  );
  
  try {
      // Trying to use serviceusage API
      const serviceusage = google.serviceusage({ version: 'v1', auth });
      console.log("\nAttempting to query enabled APIs via Service Usage API...");
      const res = await serviceusage.services.list({
          parent: `projects/${projectId}`,
          filter: 'state:ENABLED'
      });
      
      const enabledApis = res.data.services.map(s => s.config.name);
      console.log("Enabled APIs count:", enabledApis.length);
      console.log("Contains drive.googleapis.com:", enabledApis.includes('drive.googleapis.com'));
      console.log("Contains sheets.googleapis.com:", enabledApis.includes('sheets.googleapis.com'));
  } catch (err) {
      console.log("Service Usage API failed (this is normal if cloud-platform scope or Service Usage API is not enabled):", err.message);
  }

  const drive = google.drive({ version: 'v3', auth });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1ZG8BlioGVvh7Bmh8jIPWNmEaM6sC7O4LDybdPJ63mbk';

  console.log("\n=== DRIVE API TEST ===");
  try {
    const driveRes = await drive.files.get({
      fileId: spreadsheetId,
      fields: 'id,name,mimeType,driveId,webViewLink,permissions'
    });
    console.log("Drive API SUCCESS");
  } catch (err) {
    console.log("Drive API FAILED:", err.message);
    if (err.response) console.log("HTTP Status:", err.response.status);
  }

  console.log("\n=== SHEETS API TEST ===");
  try {
    const res = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });
    console.log("Sheets API SUCCESS");
  } catch (err) {
    console.log("Sheets API FAILED:", err.message);
    if (err.response) console.log("HTTP Status:", err.response.status);
  }
}

diagnose();
