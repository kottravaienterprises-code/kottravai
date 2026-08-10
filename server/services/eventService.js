const db = require('../db');
const { sendEmail } = require('../utils/mailer');
const googleSheetsService = require('./googleSheetsService');
const emailTemplates = require('../utils/emailTemplates');

/**
 * Register a participant for an event
 * @param {Object} data - The registration data
 * @returns {Object} The created registration record
 */
const registerForEvent = async (data) => {
    let { fullName, email, phone, organization } = data;

    // 1. Validate required fields
    if (!fullName || !email || !phone || !organization) {
        const error = new Error('Missing required fields');
        error.code = 'VALIDATION_ERROR';
        throw error;
    }

    // 2. Normalize email
    email = email.trim().toLowerCase();
    
    // 3. Normalize phone (strip non-digits)
    phone = phone.replace(/\D/g, '');
    
    // 4. Fixed event slug
    const EVENT_SLUG = 'design-the-next-livelihood';

    // 5. Check for existing registration
    const existingCheckSql = `
        SELECT id FROM event_registrations 
        WHERE event_slug = $1 AND email = $2
    `;
    const { rows: existingRows } = await db.query(existingCheckSql, [EVENT_SLUG, email]);
    
    if (existingRows.length > 0) {
        // 6. Return ALREADY_REGISTERED
        const error = new Error('You are already registered for this event.');
        error.code = 'ALREADY_REGISTERED';
        throw error;
    }

    // 7. Insert into PostgreSQL
    const insertSql = `
        INSERT INTO event_registrations (event_slug, full_name, email, phone, organization)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    
    const { rows } = await db.query(insertSql, [
        EVENT_SLUG,
        fullName.trim(),
        email,
        phone,
        organization.trim()
    ]);

    // 8. Append to Google Sheets (non-blocking)
    try {
        const sheetsApi = await googleSheetsService.sheets();
        const SHEET_ID = process.env.GOOGLE_SHEET_ID;
        const TAB_NAME = 'Design the Next Livelihood Registrations';

        // Ensure sheet exists (similar to campus flow)
        const spreadsheet = await sheetsApi.spreadsheets.get({ spreadsheetId: SHEET_ID });
        const sheetExists = spreadsheet.data.sheets.some(s => s.properties.title === TAB_NAME);

        if (!sheetExists) {
            await sheetsApi.spreadsheets.batchUpdate({
                spreadsheetId: SHEET_ID,
                requestBody: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: TAB_NAME,
                                gridProperties: { frozenRowCount: 1 }
                            }
                        }
                    }]
                }
            });
            // Write headers
            await sheetsApi.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: `${TAB_NAME}!A1:H1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [['Registration ID', 'Event', 'Full Name', 'Email', 'Phone', 'Organization', 'Status', 'Registered At']]
                }
            });
        }

        // Append row
        const registration = rows[0];
        await sheetsApi.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: `${TAB_NAME}!A:H`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [[
                    registration.id,
                    registration.event_slug,
                    registration.full_name,
                    registration.email,
                    registration.phone,
                    registration.organization,
                    registration.status,
                    new Date(registration.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                ]]
            }
        });
        console.log(`✅ [EVENT_REGISTRATION_SHEETS] Saved to Google Sheets: ${registration.id}`);
    } catch (err) {
        console.error('❌ [EVENT_REGISTRATION_SHEETS] Failed to save to Google Sheets:', err.message);
    }

    // 9. Send Confirmation Email (non-blocking)
    try {
        const registration = rows[0];
        const htmlContent = emailTemplates.getLivelihoodChallengeUserTemplate(registration);

        await sendEmail({
            to: registration.email,
            subject: 'Your Registration for Design the Next Livelihood is Confirmed!',
            html: htmlContent,
            type: 'contact',
        });
        console.log(`✅ [EVENT_REGISTRATION_EMAIL] Confirmation email sent to: ${registration.email}`);
    } catch (err) {
        console.error('❌ [EVENT_REGISTRATION_EMAIL] Failed to send email:', err.message);
    }

    console.log(`✅ [EVENT_REGISTRATION_DB] Registration successful: ${rows[0].id}`);

    // 10. Return the created registration
    return rows[0];
};

module.exports = {
    registerForEvent
};
