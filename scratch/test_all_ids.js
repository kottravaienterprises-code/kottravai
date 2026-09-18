require('dotenv').config({path: 'server/.env'});
const { google } = require('googleapis');

async function testIds() {
    const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    
    const ids = [
      '16ncPSaHzun9E2xAx7h30eNK8o8nkl20EcYy5ZcEFoZA',
      '1ifghOv2PZi6InZTDhlbnInwjs9OChDRv8xGPs15X1OD',
      '1UxpzenNZWnrToQh-fZZY93ae3-WqMm34T1JtBXlGVIR',
      '1Z1BEu1f78sgGIAIQ7oR0yM3hNTYXhTewjRz_rvDpwmf',
      '11RI7f5dJ8W1kJdtjzz7ky6fzxo6wjZteOnyiXUSxS56',
      '1y-zpthx4izvuyU9zx2R4l5ZsxpSVfYolf3qQ8jcUyU6',
      '17-37k-R3venxYe7SM6RVer5QeIQqJdl8pxabw_ffx64',
      '1Z4_5l-78kvstfIiwQkuWQ8QvYlFBr1_Um_5UvmbR6SF',
      '1by7VyHKq8kat68hrwp-RGmmGF4f0m7KaZrt0Vo-lcP9',
      '12bStNtDbYLA0mwi0VBbOyvAygYeW1wopFRApnHN1nzX',
      '1_2cyO20S9WqCfMvbFg873ctNcYtZARmlbDkQEbNvxbO',
      '12tClpvyEMNLhyefhOzzH-Z4ndEqVf0ae23pIaY67PN2',
      '1oxpFmAJ1hMcjbyiLCcLpk1RakrFL6Z0z4B0DAJkHQyv',
      '1NBQdv0U4GuzoeW1rih5zlgmPgR9CYYV2TSG116PVxF3',
      '1sRWSI8VrluXqvCRAS7UReSXJAOj2xeCj7ZEycX0Lwq1',
      '1J8Np5iES1ZxcbQqOQQCp4zx1I6exctSbTWlx9MpwzLW',
      '12-MmkBGEOaWjDDJP1r_2cEyWNYr3ePFNRkIyQ7SP55Q' // OLD ONE
    ];

    for (const id of ids) {
        try {
            const res = await sheets.spreadsheets.get({ spreadsheetId: id });
            console.log("SUCCESS:", id, "->", res.data.properties.title);
        } catch(e) {
            console.log("FAILED:", id, e.message);
        }
    }
}
testIds();
