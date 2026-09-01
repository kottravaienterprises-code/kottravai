require('dotenv').config();
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const pool = require('../db');

const DRY_RUN = process.env.DRY_RUN === 'true';
const RETENTION_DAYS = parseInt(process.env.ANALYTICS_RETENTION_DAYS || '90', 10);
const ARCHIVE_DIR = path.join(__dirname, '../../analytics_archives');

async function archiveAnalytics() {
    console.log(`[ARCHIVE] Starting Archive Process. DRY_RUN: ${DRY_RUN}, RETENTION_DAYS: ${RETENTION_DAYS}`);
    
    if (!fs.existsSync(ARCHIVE_DIR)) {
        fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffDateStr = cutoffDate.toISOString();

    console.log(`[ARCHIVE] Cutoff Date calculated as: ${cutoffDateStr}`);

    try {
        // 1. Calculate eligible row count and date range
        const countQuery = `
            SELECT COUNT(*) as count, MIN(event_timestamp) as start_date, MAX(event_timestamp) as end_date 
            FROM analytics_events 
            WHERE event_timestamp < $1
        `;
        const countRes = await pool.query(countQuery, [cutoffDateStr]);
        const rowCount = parseInt(countRes.rows[0].count, 10);

        if (rowCount === 0) {
            console.log('[ARCHIVE] No records found older than cutoff date. Exiting.');
            process.exit(0);
        }

        const startDate = countRes.rows[0].start_date;
        const endDate = countRes.rows[0].end_date;
        const startDateStr = new Date(startDate).toISOString().split('T')[0];
        const endDateStr = new Date(endDate).toISOString().split('T')[0];
        const filename = `analytics_${startDateStr}_to_${endDateStr}.csv.gz`;
        const filepath = path.join(ARCHIVE_DIR, filename);

        console.log(`[ARCHIVE] Found ${rowCount} eligible records.`);
        console.log(`[ARCHIVE] Date Range: ${startDateStr} to ${endDateStr}`);
        console.log(`[ARCHIVE] Target Archive: ${filename}`);

        // Check idempotency: If this exact date range is already deleted, skip
        const manifestCheck = await pool.query(`SELECT status FROM analytics_archive_manifest WHERE archive_filename = $1`, [filename]);
        if (manifestCheck.rows.length > 0 && manifestCheck.rows[0].status === 'deleted') {
            console.log(`[ARCHIVE] Archive ${filename} already exists and status is 'deleted'. Skipping to prevent duplication.`);
            process.exit(0);
        }

        if (DRY_RUN) {
            console.log('[ARCHIVE] DRY RUN COMPLETE. No data was exported or deleted.');
            process.exit(0);
        }

        console.log('[ARCHIVE] Executing real archive export...');
        
        // 2. Select exact eligible records
        const recordsQuery = `
            SELECT * FROM analytics_events 
            WHERE event_timestamp < $1 
            ORDER BY event_timestamp ASC
        `;
        const recordsRes = await pool.query(recordsQuery, [cutoffDateStr]);
        
        if (recordsRes.rows.length !== rowCount) {
            console.error(`[ARCHIVE_ERROR] Row count mismatch! Expected ${rowCount}, got ${recordsRes.rows.length}. Aborting.`);
            process.exit(1);
        }

        // 3. Export to CSV.GZ
        const gzip = zlib.createGzip();
        const outStream = fs.createWriteStream(filepath);
        
        // Build CSV string
        const headers = Object.keys(recordsRes.rows[0]).join(',');
        let csvContent = headers + '\n';
        
        recordsRes.rows.forEach(row => {
            const values = Object.values(row).map(val => {
                if (val === null || val === undefined) return '';
                let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
                str = str.replace(/"/g, '""');
                return `"${str}"`;
            });
            csvContent += values.join(',') + '\n';
        });

        await new Promise((resolve, reject) => {
            outStream.on('finish', resolve);
            outStream.on('error', reject);
            gzip.pipe(outStream);
            gzip.write(csvContent);
            gzip.end();
        });

        console.log('[ARCHIVE] Export complete. Starting verification...');

        // 4. Verify Archive
        const fileBuffer = fs.readFileSync(filepath);
        
        // Calculate checksum
        const hash = crypto.createHash('sha256');
        hash.update(fileBuffer);
        const checksum = hash.digest('hex');

        // Decompress and verify
        const decompressed = zlib.gunzipSync(fileBuffer).toString('utf8');
        const lines = decompressed.trim().split('\n');
        
        // Verify Row Count (lines length - 1 for header)
        if (lines.length - 1 !== rowCount) {
            console.error(`[ARCHIVE_VERIFICATION_FAILED] Extracted row count (${lines.length - 1}) does not match DB row count (${rowCount}). Aborting.`);
            fs.unlinkSync(filepath);
            process.exit(1);
        }

        console.log('[ARCHIVE] Verification Passed! Archive is readable and row counts match.');
        console.log(`[ARCHIVE] Checksum: ${checksum}`);

        // 5. Update Manifest
        const manifestInsert = `
            INSERT INTO analytics_archive_manifest (archive_filename, start_date, end_date, row_count, checksum, status, verified_at)
            VALUES ($1, $2, $3, $4, $5, 'verified', CURRENT_TIMESTAMP)
            RETURNING id
        `;
        const manifestRes = await pool.query(manifestInsert, [filename, startDate, endDate, rowCount, checksum]);
        const manifestId = manifestRes.rows[0].id;
        console.log(`[ARCHIVE] Manifest created with ID: ${manifestId}`);

        // 6. DELETE exact archived records safely
        console.log(`[ARCHIVE] DELETING ${rowCount} rows from database...`);
        const deleteQuery = `
            DELETE FROM analytics_events 
            WHERE id IN (
                SELECT id FROM analytics_events WHERE event_timestamp < $1
            )
        `;
        const deleteRes = await pool.query(deleteQuery, [cutoffDateStr]);
        
        if (deleteRes.rowCount !== rowCount) {
            console.warn(`[ARCHIVE_WARNING] Deleted row count (${deleteRes.rowCount}) did not perfectly match exported row count (${rowCount}).`);
        }

        // Finalize manifest
        await pool.query(`UPDATE analytics_archive_manifest SET status = 'deleted', deletion_completed_at = CURRENT_TIMESTAMP WHERE id = $1`, [manifestId]);

        console.log(`[ARCHIVE] Successfully deleted archived rows. Storage freed.`);
        
        // 7. Supabase Storage Monitoring Output
        const remainingQuery = await pool.query('SELECT COUNT(*) as count FROM analytics_events');
        console.log(`[STORAGE_MONITOR] Remaining active analytics_events rows: ${remainingQuery.rows[0].count}`);

        process.exit(0);

    } catch (err) {
        console.error('[ARCHIVE_FATAL_ERROR]', err);
        process.exit(1);
    }
}

archiveAnalytics();
