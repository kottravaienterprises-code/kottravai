/**
 * Test Suite for Phase 1: Kottravai Offline Invoice — Database & Pricing Foundation
 */

const assert = require('assert');
const path = require('path');
const orderPricing = require('../server/services/orderPricing');

console.log('🧪 Starting Phase 1 Unit Tests...\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
    totalTests++;
    try {
        fn();
        console.log(`✅ TEST ${totalTests}: ${testName} - PASSED`);
        passedTests++;
    } catch (err) {
        console.error(`❌ TEST ${totalTests}: ${testName} - FAILED`);
        console.error(err.stack || err.message);
    }
}

async function runAsyncTest(testName, fn) {
    totalTests++;
    try {
        await fn();
        console.log(`✅ TEST ${totalTests}: ${testName} - PASSED`);
        passedTests++;
    } catch (err) {
        console.error(`❌ TEST ${totalTests}: ${testName} - FAILED`);
        console.error(err.stack || err.message);
    }
}

async function main() {

    // TEST 1: Tamil Nadu customer, GST added to subtotal (Intra-state GST)
    runTest('Tamil Nadu customer, ₹1,000 subtotal plus 18% GST', () => {
        const items = [{ id: 'prod_1', quantity: 1 }];
        const dbProducts = [{ id: 'prod_1', name: 'Test Product', price: 1000, gst_rate: 18 }];

        const res = orderPricing.calculateOfflinePricing({
            items,
            dbProducts,
            placeOfSupply: 'Tamil Nadu',
            discountAmount: 0
        });

        assert.strictEqual(res.subtotal, 1000, 'Subtotal should be 1000');
        assert.strictEqual(res.discount, 0, 'Discount should be 0');
        assert.strictEqual(res.taxableAmount, 1000, 'Taxable Amount should equal the subtotal');
        assert.strictEqual(res.cgst, 90, 'CGST should be 9% of the subtotal');
        assert.strictEqual(res.sgst, 90, 'SGST should be 9% of the subtotal');
        assert.strictEqual(res.igst, 0, 'IGST should be 0');
        assert.strictEqual(res.grandTotal, 1180, 'Grand Total should include GST added to the subtotal');
    });

    // TEST 2: Karnataka customer, GST added to subtotal (Inter-state GST)
    runTest('Karnataka customer, ₹1,000 subtotal plus 18% GST', () => {
        const items = [{ id: 'prod_1', quantity: 1 }];
        const dbProducts = [{ id: 'prod_1', name: 'Test Product', price: 1000, gst_rate: 18 }];

        const res = orderPricing.calculateOfflinePricing({
            items,
            dbProducts,
            placeOfSupply: 'Karnataka',
            discountAmount: 0
        });

        assert.strictEqual(res.subtotal, 1000, 'Subtotal should be 1000');
        assert.strictEqual(res.taxableAmount, 1000, 'Taxable Amount should equal the subtotal');
        assert.strictEqual(res.cgst, 0, 'CGST should be 0');
        assert.strictEqual(res.sgst, 0, 'SGST should be 0');
        assert.strictEqual(res.igst, 180, 'IGST should be 18% of the subtotal');
        assert.strictEqual(res.grandTotal, 1180, 'Grand Total should include GST added to the subtotal');
    });

    // TEST 3: Tamil Nadu subtotal with discount before GST
    runTest('Tamil Nadu, ₹1,000 subtotal with ₹100 discount and 18% GST', () => {
        const items = [{ id: 'prod_1', quantity: 1 }];
        const dbProducts = [{ id: 'prod_1', name: 'Test Product', price: 1000, gst_rate: 18 }];

        const res = orderPricing.calculateOfflinePricing({
            items,
            dbProducts,
            placeOfSupply: 'Tamil Nadu',
            discountAmount: 100
        });

        assert.strictEqual(res.subtotal, 1000, 'Subtotal should be 1000');
        assert.strictEqual(res.discount, 100, 'Discount should be 100');
        assert.strictEqual(res.taxableAmount, 900, 'Taxable Amount should equal subtotal after discount');
        assert.strictEqual(res.cgst, 81, 'CGST should be 9% of the discounted subtotal');
        assert.strictEqual(res.sgst, 81, 'SGST should be 9% of the discounted subtotal');
        assert.strictEqual(res.igst, 0, 'IGST should be 0');
        assert.strictEqual(res.grandTotal, 1062, 'Grand Total should include GST after discount');
    });

    // TEST 4: Mixed GST rates are calculated per product subtotal.
    runTest('Mixed product GST rates are added to each product subtotal', () => {
        const items = [
            { id: 'p1', quantity: 1 },
            { id: 'p2', quantity: 1 },
            { id: 'p3', quantity: 1 },
            { id: 'p4', quantity: 1 }
        ];
        const dbProducts = [
            { id: 'p1', price: 360, gst_rate: 5 },
            { id: 'p2', price: 150, gst_rate: 18 },
            { id: 'p3', price: 750, gst_rate: 5 },
            { id: 'p4', price: 450, gst_rate: 5 }
        ];

        const res = orderPricing.calculateOfflinePricing({
            items,
            dbProducts,
            placeOfSupply: 'Tamil Nadu',
            shippingFee: 50
        });

        assert.strictEqual(res.subtotal, 1710, 'Subtotal should equal the product prices');
        assert.strictEqual(res.taxableAmount, 1710, 'Taxable amount should equal the subtotal');
        assert.strictEqual(res.cgst + res.sgst, 105, 'GST should be calculated per product rate');
        assert.strictEqual(res.grandTotal, 1865, 'GST and shipping should be added to the subtotal');
    });

    runTest('5% GST adds 5% of ₹3,524 to the subtotal', () => {
        const res = orderPricing.calculateOfflinePricing({
            items: [{ id: 'prod_1', quantity: 1 }],
            dbProducts: [
                { id: 'prod_1', name: 'Test Product', price: 3524, gst_rate: 18 }
            ],
            placeOfSupply: 'Tamil Nadu',
            gstRate: 5
        });

        assert.strictEqual(res.taxableAmount, 3524);
        assert.strictEqual(res.cgst, 88.1);
        assert.strictEqual(res.sgst, 88.1);
        assert.strictEqual(res.grandTotal, 3700.2);
        assert.strictEqual(res.items[0].gstRate, 5, 'Invoice GST rate should override product GST');
    });

    runTest('Invalid invoice GST rate is rejected', () => {
        assert.throws(() => {
            orderPricing.calculateOfflinePricing({
                items: [{ id: 'prod_1', quantity: 1 }],
                dbProducts: [{ id: 'prod_1', price: 100, gst_rate: 5 }],
                gstRate: 101
            });
        }, /INVALID_GST_RATE/);
    });

    // TEST 5: Discount Greater than Subtotal (Validation Error)
    runTest('Discount greater than subtotal validation error', () => {
        const items = [{ id: 'prod_1', quantity: 1 }];
        const dbProducts = [{ id: 'prod_1', name: 'Test Product', price: 1000, gst_rate: 18 }];

        assert.throws(() => {
            orderPricing.calculateOfflinePricing({
                items,
                dbProducts,
                placeOfSupply: 'Tamil Nadu',
                discountAmount: 1200
            });
        }, /Discount \(₹1200\) cannot exceed subtotal \(₹1000\)/);
    });

    // TEST 5: Website Parity Check
    runTest('Website order calculation parity', () => {
        const items = [
            { id: 'p1', quantity: 2, selectedVariant: { weight: '500g' } },
            { id: 'p2', quantity: 1, customizationData: { isCustomized: true, customizationCharge: 150 } }
        ];

        const dbProducts = [
            { id: 'p1', price: 200, variants: [{ weight: '500g', price: 250 }], gst_rate: 12 },
            { id: 'p2', price: 500, variants: null, gst_rate: 18 }
        ];

        // Legacy recalculateTotals logic simulation
        let subtotalCents = (250 * 100 * 2) + (500 * 100 + 150 * 100);
        let totalGstCents = Math.round((250 * 100 * 2) * (12 / 100)) + Math.round((650 * 100) * (18 / 100));
        let expectedLegacy = {
            subtotalCents,
            shippingCents: 10000,
            totalGstCents,
            totalCents: subtotalCents + 10000 + totalGstCents,
            zoneName: 'Test Zone'
        };

        const newCalc = orderPricing.calculateWebsiteTotals(items, dbProducts, { shippingFee: 100, zoneName: 'Test Zone' });

        assert.strictEqual(newCalc.subtotalCents, expectedLegacy.subtotalCents, 'Subtotal cents must match exactly');
        assert.strictEqual(newCalc.shippingCents, expectedLegacy.shippingCents, 'Shipping cents must match exactly');
        assert.strictEqual(newCalc.totalGstCents, expectedLegacy.totalGstCents, 'Total GST cents must match exactly');
        assert.strictEqual(newCalc.totalCents, expectedLegacy.totalCents, 'Total cents must match exactly');
    });

    // TEST 6: Financial Year Logic
    runTest('Financial Year boundary checks', () => {
        assert.strictEqual(orderPricing.getFinancialYear('2026-03-31'), '2025-26', '2026-03-31 should be 2025-26');
        assert.strictEqual(orderPricing.getFinancialYear('2026-04-01'), '2026-27', '2026-04-01 should be 2026-27');
        assert.strictEqual(orderPricing.getFinancialYear('2026-10-06'), '2026-27', '2026-10-06 should be 2026-27');
        assert.strictEqual(orderPricing.getFinancialYear('2027-03-31'), '2026-27', '2027-03-31 should be 2026-27');
        assert.strictEqual(orderPricing.getFinancialYear('2027-04-01'), '2027-28', '2027-04-01 should be 2027-28');
    });

    // TEST 7 & 8: Invoice Sequence Mock Test
    await runAsyncTest('Invoice sequence formatting & mock generation', async () => {
        let sequenceCounter = 0;
        const mockDb = {
            query: async (sql, params) => {
                if (sql.includes('get_next_offline_invoice_number')) {
                    sequenceCounter++;
                    const fy = params[0];
                    const num = String(sequenceCounter).padStart(4, '0');
                    return { rows: [{ invoice_number: `OFF-INV-${fy}-${num}` }] };
                }
                throw new Error('Unexpected query');
            }
        };

        const inv1 = await orderPricing.getNextInvoiceNumber(mockDb, new Date('2026-10-06'));
        const inv2 = await orderPricing.getNextInvoiceNumber(mockDb, new Date('2026-10-06'));
        const inv3 = await orderPricing.getNextInvoiceNumber(mockDb, new Date('2026-10-06'));

        assert.strictEqual(inv1, 'OFF-INV-2026-27-0001');
        assert.strictEqual(inv2, 'OFF-INV-2026-27-0002');
        assert.strictEqual(inv3, 'OFF-INV-2026-27-0003');
    });

    // TEST 9: Idempotency Schema Verification
    runTest('Idempotency & Invoice schema properties', () => {
        const items = [{ id: 'prod_1', quantity: 2 }];
        const dbProducts = [{ id: 'prod_1', name: 'Millet Cookies', price: 150, gst_rate: 5 }];

        const res = orderPricing.calculateOfflinePricing({
            items,
            dbProducts,
            placeOfSupply: 'TN',
            discountAmount: 20
        });

        assert.strictEqual(res.items.length, 1);
        const item = res.items[0];
        assert.ok('productId' in item, 'productId present');
        assert.ok('productName' in item, 'productName present');
        assert.ok('quantity' in item, 'quantity present');
        assert.ok('unitPrice' in item, 'unitPrice present');
        assert.ok('subtotal' in item, 'subtotal present');
        assert.ok('discount' in item, 'discount present');
        assert.ok('taxableValue' in item, 'taxableValue present');
        assert.ok('gstRate' in item, 'gstRate present');
        assert.ok('cgst' in item, 'cgst present');
        assert.ok('sgst' in item, 'sgst present');
        assert.ok('igst' in item, 'igst present');
    });

    console.log(`\n📊 TEST RESULTS: ${passedTests} / ${totalTests} Passed.`);
    if (passedTests !== totalTests) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal test runner failure:', err);
    process.exit(1);
});
