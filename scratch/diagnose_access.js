require('dotenv').config({path: 'server/.env'});
const { google } = require('googleapis');

async function diagnose() {
  console.log("=== ACCESS DIAGNOSTIC SCRIPT ===");
  const email = process.env.GOOGLE_CLIENT_EMAIL || '';
  console.log("Service Account Email:", email);
  
  const match = email.match(/@(.+)\.iam\.gserviceaccount\.com/);
  const projectId = match ? match[1] : 'UNKNOWN';
  console.log("Inferred Project ID:", projectId);

  const auth = new google.auth.JWT(
    email,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  );
  
  const drive = google.drive({ version: 'v3', auth });
  const sheets = google.sheets({ version: 'v4', auth });
  const targetId = '1ZG8BlioGVvh7Bmh8jIPWNmEaM6sC7O4LDybdPJ63mbk';
  const targetName = 'Kottravai_metrics_part2_PROD';

  console.log("\n=== 1. DRIVE API: files.list (Search by Name) ===");
  try {
    const listResName = await drive.files.list({
      q: `name = '${targetName}'`,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, name, mimeType, owners, driveId, shared)'
    });
    console.log(`Found ${listResName.data.files.length} files matching name '${targetName}'.`);
    listResName.data.files.forEach(f => {
      console.log(`  - File: ${f.name} | ID: ${f.id} | DriveID: ${f.driveId || 'N/A'}`);
      if (f.owners && f.owners.length > 0) {
        console.log(`    Owner: ${f.owners[0].emailAddress} (${f.owners[0].displayName})`);
      }
    });
  } catch(e) {
    console.log("files.list by name FAILED:", e.message);
  }

  console.log("\n=== 2. DRIVE API: files.list (All files) ===");
  try {
    const listResAll = await drive.files.list({
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, name, mimeType, owners, driveId, shared)'
    });
    console.log(`Total files visible to service account: ${listResAll.data.files.length}`);
    listResAll.data.files.forEach(f => {
      console.log(`  - File: ${f.name} | ID: ${f.id}`);
      if (f.id === targetId) console.log("    ^^^ THIS IS THE TARGET SPREADSHEET!");
    });
  } catch(e) {
    console.log("files.list all FAILED:", e.message);
  }

  console.log("\n=== 3. DRIVE API: files.get (Exact ID) ===");
  try {
    const getRes = await drive.files.get({
      fileId: targetId,
      supportsAllDrives: true,
      fields: 'id, name, mimeType, owners, permissions, driveId, shared'
    });
    console.log("Drive API files.get SUCCESS. Service account CAN see the exact ID.");
    const f = getRes.data;
    console.log("ID:", f.id);
    console.log("Name:", f.name);
    console.log("MimeType:", f.mimeType);
    console.log("Shared:", f.shared);
    console.log("DriveID:", f.driveId || 'N/A');
    if (f.owners && f.owners.length > 0) {
      console.log("Owner:", f.owners[0].emailAddress);
    }
    if (f.permissions) {
      console.log("Permissions visible:");
      f.permissions.forEach(p => {
         console.log(`  - Role: ${p.role} | Type: ${p.type} | Email: ${p.emailAddress || 'N/A'}`);
      });
    }
  } catch(e) {
    console.log("Drive API files.get FAILED:", e.message);
    if (e.response) console.log("HTTP Status:", e.response.status);
  }

  console.log("\n=== 4. SHEETS API: spreadsheets.get (Exact ID) ===");
  try {
    const sheetsRes = await sheets.spreadsheets.get({
      spreadsheetId: targetId
    });
    console.log("Sheets API spreadsheets.get SUCCESS.");
    console.log("Spreadsheet Title:", sheetsRes.data.properties.title);
  } catch(e) {
    console.log("Sheets API FAILED:", e.message);
    if (e.response) console.log("HTTP Status:", e.response.status);
  }
}

diagnose();
