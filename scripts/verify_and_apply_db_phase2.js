/**
 * PART A: Database verification and safe migration application script
 */

const fs = require('fs');
const path = require('path');
const db = require('../server/db');

async function main() {
    console.log('🔍 [PART A] Starting Pre-Phase-2 Database Verification...\n');

    try {
        // 1. Check orders columns
        const colsRes = await db.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'orders'
        `);
        const existingCols = colsRes.rows.map(r => r.column_name);

        const requiredCols = [
            'source', 'invoice_number', 'invoice_date', 'payment_status',
            'payment_method', 'payment_reference', 'amount_paid', 'discount_server',
            'taxable_amount_server', 'cgst_server', 'sgst_server', 'igst_server',
            'customer_company', 'customer_gstin', 'place_of_supply', 'billing_address',
            'notes', 'created_by', 'idempotency_key'
        ];

        const missingCols = requiredCols.filter(col => !existingCols.includes(col));

        // 2. Check invoice_sequences table
        const tableRes = await db.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name = 'invoice_sequences'
        `);
        const tableExists = tableRes.rows.length > 0;

        // 3. Check function get_next_offline_invoice_number
        const funcRes = await db.query(`
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_name = 'get_next_offline_invoice_number'
        `);
        const funcExists = funcRes.rows.length > 0;

        console.log('📋 Database Audit Results:');
        console.log(`- Orders columns missing: ${missingCols.length > 0 ? missingCols.join(', ') : 'NONE (All columns present)'}`);
        console.log(`- Table invoice_sequences: ${tableExists ? 'EXISTS' : 'MISSING'}`);
        console.log(`- Function get_next_offline_invoice_number: ${funcExists ? 'EXISTS' : 'MISSING'}\n`);

        if (missingCols.length > 0 || !tableExists || !funcExists) {
            console.log('⚡ Applying Phase 1 Migration SQL to target database...');
            const migrationSql = fs.readFileSync(
                path.resolve(__dirname, '../supabase/migrations/20261006000000_offline_invoice_foundation.sql'),
                'utf8'
            );
            await db.query(migrationSql);
            console.log('✅ Migration applied successfully!\n');
        } else {
            console.log('✅ Migration was already applied to the target database.\n');
        }

        // 4. Verify existing website orders have source = 'website'
        const webOrdersRes = await db.query(`
            SELECT COUNT(*) as count FROM orders WHERE source IS NULL
        `);
        if (parseInt(webOrdersRes.rows[0].count) > 0) {
            console.log('🔧 Updating existing orders with source = null to website...');
            await db.query(`UPDATE orders SET source = 'website' WHERE source IS NULL`);
        }
        console.log('✅ Existing website orders verified (`source = website`).\n');

        // 5. Test sequence generation against actual database
        console.log('🧪 Testing atomic sequence function get_next_offline_invoice_number("2026-27") on DB...');
        const seq1Res = await db.query(`SELECT get_next_offline_invoice_number('2026-27') AS invoice_number`);
        const seq1 = seq1Res.rows[0].invoice_number;
        console.log(`   Call 1 returned: ${seq1}`);

        const seq2Res = await db.query(`SELECT get_next_offline_invoice_number('2026-27') AS invoice_number`);
        const seq2 = seq2Res.rows[0].invoice_number;
        console.log(`   Call 2 returned: ${seq2}`);

        if (seq1.startsWith('OFF-INV-2026-27-') && seq2.startsWith('OFF-INV-2026-27-')) {
            const num1 = parseInt(seq1.split('-').pop());
            const num2 = parseInt(seq2.split('-').pop());
            if (num2 === num1 + 1) {
                console.log(`✅ Atomic sequence increment verified on live DB (${num1} -> ${num2}).\n`);
            } else {
                throw new Error(`Sequence failed to increment properly: ${seq1} -> ${seq2}`);
            }
        } else {
            throw new Error(`Sequence format unexpected: ${seq1}`);
        }

        console.log('🎉 PART A VERIFICATION COMPLETE & PASSED!');
        process.exit(0);

    } catch (err) {
        console.error('❌ PART A VERIFICATION FAILED:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

main();
