require('dotenv').config({path: 'server/.env'});
const { google } = require('googleapis');

async function listFiles() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    [
      'https://www.googleapis.com/auth/drive.readonly'
    ]
  );

  const drive = google.drive({ version: 'v3', auth });

  try {
    const res = await drive.files.list({
      pageSize: 10,
      fields: 'nextPageToken, files(id, name)',
    });
    const files = res.data.files;
    if (files.length === 0) {
      console.log('No files found.');
    } else {
      console.log('Files shared with service account:');
      files.map((file) => {
        console.log(`${file.name} (${file.id})`);
      });
    }
  } catch (err) {
    console.error('The API returned an error: ' + err.message);
  }
}

listFiles();
