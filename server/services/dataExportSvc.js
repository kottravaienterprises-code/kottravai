const db = require('../db');
const fs = require('fs').promises;
const path = require('path');

class DataExportService {
    constructor() {
        this.exportDir = path.join(__dirname, '../../exports');
    }

    async init() {
        try {
            await fs.mkdir(this.exportDir, { recursive: true });
        } catch (e) {
            console.error('[DataExportSvc] Failed to create export directory', e);
        }
    }

    /**
     * Run a full or incremental snapshot export.
     * In a real scenario, this streams data to AWS S3 / Snowflake stages.
     */
    async runExport(type = 'revenue_snapshots') {
        await this.init();
        
        console.log(`[DataExportSvc] Starting export for ${type}`);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${type}_${timestamp}.json`;
        const filepath = path.join(this.exportDir, filename);

        try {
            let data = [];
            if (type === 'revenue_snapshots') {
                const { rows } = await db.query(`SELECT * FROM public.revenue_snapshots ORDER BY snapshot_date DESC LIMIT 1000`);
                data = rows;
            } else if (type === 'anomalies') {
                const { rows } = await db.query(`SELECT * FROM public.revenue_anomalies ORDER BY detected_at DESC LIMIT 1000`);
                data = rows;
            } else if (type === 'event_audit_logs') {
                const { rows } = await db.query(`SELECT * FROM public.event_audit_logs ORDER BY created_at DESC LIMIT 1000`);
                data = rows;
            } else {
                throw new Error(`Unknown export type: ${type}`);
            }

            // Write to local file (mocking S3 upload)
            const exportPayload = {
                metadata: {
                    type,
                    timestamp,
                    recordCount: data.length
                },
                data
            };

            await fs.writeFile(filepath, JSON.stringify(exportPayload, null, 2));
            console.log(`[DataExportSvc] Exported ${data.length} records to ${filepath}`);

            return {
                success: true,
                filename,
                recordCount: data.length,
                path: filepath
            };
        } catch (err) {
            console.error(`[DataExportSvc] Export failed for ${type}`, err);
            throw err;
        }
    }
}

module.exports = new DataExportService();
