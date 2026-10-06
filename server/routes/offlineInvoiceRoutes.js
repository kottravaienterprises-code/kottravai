/**
 * Express router for Admin Offline / Manual Invoices.
 *
 * Mounted at `/api/admin/offline-invoices` behind `authenticateAdmin`.
 *
 * Features:
 * - Product search (reads live products from DB, no duplication)
 * - Server-side quotation / preview (/quote)
 * - Invoice creation in a single DB transaction (BEGIN/COMMIT/ROLLBACK)
 * - Atomic financial year sequence generator (OFF-INV-2026-27-0001)
 * - Strict server-side validation of customer, products, prices, GSTIN & state matching
 * - Payment status updates (line items are locked once issued)
 * - Optional manual email action (does NOT fire automatically)
 */

const express = require('express');
const db = require('../db');
const {
    SELLER_STATE,
    GST_STATES,
    findState,
    validateGstin,
    isIntraState
} = require('../utils/gstStates');
const {
    fetchPricingProducts,
    priceLineItems,
    resolveDiscountCents,
    splitGst,
    getFinancialYear,
    formatInvoiceNumber
} = require('../services/orderPricing');

const router = express.Router();

// Role restriction helper: AUDITOR is read-only
const requireWritePermission = (req, res, next) => {
    if (req.adminRole === 'AUDITOR') {
        return res.status(403).json({ error: 'Auditor role has read-only access' });
    }
    next();
};

/**
 * GET /meta
 * Metadata for frontend dropdowns (States list, Seller info, Payment options).
 */
router.get('/meta', (req, res) => {
    res.json({
        sellerState: SELLER_STATE,
        states: GST_STATES,
        paymentStatuses: ['Paid', 'Pending', 'Partial'],
        paymentMethods: ['Cash', 'Bank Transfer', 'UPI', 'Other']
    });
});

/**
 * GET /products
 * Search live products for product selector (by name, SKU, or UUID).
 */
router.get('/products', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        let queryText = `
            SELECT id, name, sku, price, variants, gst_rate, image, category, is_live
            FROM products
            WHERE is_live = TRUE
        `;
        const params = [];

        if (q) {
            params.push(`%${q}%`);
            queryText += ` AND (name ILIKE $1 OR sku ILIKE $1 OR id::text ILIKE $1)`;
        }

        queryText += ` ORDER BY name ASC LIMIT 30`;
        const result = await db.query(queryText, params);

        res.json({
            success: true,
            products: result.rows.map(p => ({
                id: p.id,
                name: p.name,
                sku: p.sku || `SKU-${p.id.slice(0, 8)}`,
                price: Number(p.price),
                variants: p.variants || [],
                gstRate: Number(p.gst_rate || 0),
                image: p.image,
                category: p.category
            }))
        });
    } catch (err) {
        console.error('❌ [OFFLINE_INVOICE] Product search error:', err);
        res.status(500).json({ error: 'Failed to search products', message: err.message });
    }
});

/**
 * Helper to validate & prepare offline invoice input payloads
 */
const validateInvoicePayload = async (queryable, payload) => {
    const errors = [];
    const {
        customerName,
        customerPhone,
        customerEmail,
        customerCompany,
        customerGstin,
        placeOfSupply,
        billingAddress,
        items,
        discount,
        shipping,
        paymentStatus,
        paymentMethod,
        amountPaid
    } = payload;

    // Customer Validation
    if (!customerName || String(customerName).trim().length < 2) {
        errors.push('Customer name is required (at least 2 characters)');
    }
    if (!customerPhone || String(customerPhone).trim().length < 5) {
        errors.push('Customer phone number is required');
    }

    if (!billingAddress || typeof billingAddress !== 'object') {
        errors.push('Billing address object is required');
    } else {
        if (!billingAddress.address || !String(billingAddress.address).trim()) errors.push('Billing street address is required');
        if (!billingAddress.city || !String(billingAddress.city).trim()) errors.push('Billing city is required');
        if (!billingAddress.state || !String(billingAddress.state).trim()) errors.push('Billing state is required');
        if (!billingAddress.pincode || !String(billingAddress.pincode).trim()) errors.push('Billing pincode is required');
    }

    // Place of Supply
    if (!placeOfSupply || !findState(placeOfSupply)) {
        errors.push('Valid Place of Supply (state) is required');
    }

    // GSTIN Validation
    if (customerGstin && String(customerGstin).trim()) {
        const gstinRes = validateGstin(customerGstin);
        if (!gstinRes.valid) {
            errors.push(gstinRes.error);
        } else {
            // Check state code matching
            const posState = findState(placeOfSupply);
            if (posState && gstinRes.state.code !== posState.code) {
                errors.push(`GSTIN state (${gstinRes.state.name}, code ${gstinRes.state.code}) does not match Place of Supply (${posState.name}, code ${posState.code})`);
            }
        }
    }

    // Items Validation
    if (!Array.isArray(items) || items.length === 0) {
        errors.push('At least one product item is required');
    }

    const itemIds = [];
    if (Array.isArray(items)) {
        items.forEach((it, idx) => {
            if (!it.id) errors.push(`Item #${idx + 1} is missing product ID`);
            else itemIds.push(it.id);

            const qty = Number(it.quantity);
            if (!Number.isInteger(qty) || qty < 1 || qty > 10000) {
                errors.push(`Item #${idx + 1} has invalid quantity (must be integer between 1 and 10000)`);
            }
        });
    }

    // Payment Validation
    const validStatuses = ['Paid', 'Pending', 'Partial'];
    if (!paymentStatus || !validStatuses.includes(paymentStatus)) {
        errors.push(`Payment status must be one of: ${validStatuses.join(', ')}`);
    }

    const validMethods = ['Cash', 'Bank Transfer', 'UPI', 'Other'];
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
        errors.push(`Payment method must be one of: ${validMethods.join(', ')}`);
    }

    // Fetch DB Products to lock & price
    let dbProducts = [];
    if (itemIds.length > 0 && errors.length === 0) {
        try {
            dbProducts = await fetchPricingProducts(queryable, itemIds, { lock: true });
            const missing = itemIds.filter(id => !dbProducts.some(p => p.id === id));
            if (missing.length > 0) {
                errors.push(`Products not found in database: ${missing.join(', ')}`);
            }
        } catch (dbErr) {
            errors.push(`Product lookup failed: ${dbErr.message}`);
        }
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    // Calculate Prices using shared engine
    const shippingCents = Math.max(0, Math.round(Number(shipping || 0) * 100));

    // Calculate subtotal & temp price to resolve discount percentage if any
    const tempPricing = priceLineItems(items, dbProducts, { discountCents: 0 });
    const discountCents = resolveDiscountCents(tempPricing.subtotalCents, discount);

    const pricing = priceLineItems(items, dbProducts, { discountCents });
    const gstSplit = splitGst(pricing.totalGstCents, placeOfSupply);
    const grandTotalCents = pricing.taxableCents + pricing.totalGstCents + shippingCents;
    const grandTotal = grandTotalCents / 100;

    // Validate Amount Paid vs Status
    let finalAmountPaidCents = 0;
    if (paymentStatus === 'Paid') {
        finalAmountPaidCents = grandTotalCents;
    } else if (paymentStatus === 'Pending') {
        finalAmountPaidCents = 0;
    } else if (paymentStatus === 'Partial') {
        const paidNum = Number(amountPaid);
        if (isNaN(paidNum) || paidNum <= 0) {
            errors.push('Amount paid must be greater than 0 for Partial payment status');
        } else {
            const paidCents = Math.round(paidNum * 100);
            if (paidCents >= grandTotalCents) {
                errors.push('Amount paid for Partial status must be strictly less than Grand Total (use Paid status instead)');
            } else {
                finalAmountPaidCents = paidCents;
            }
        }
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return {
        valid: true,
        dbProducts,
        pricing,
        gstSplit,
        shippingCents,
        grandTotalCents,
        grandTotal,
        amountPaidCents: finalAmountPaidCents
    };
};

/**
 * POST /quote
 * Live price calculation & tax breakdown preview (Does NOT write to DB).
 */
router.post('/quote', async (req, res) => {
    try {
        const validation = await validateInvoicePayload(db, req.body);
        if (!validation.valid) {
            return res.status(400).json({ success: false, errors: validation.errors });
        }

        const { pricing, gstSplit, shippingCents, grandTotalCents } = validation;

        res.json({
            success: true,
            subtotal: pricing.subtotalCents / 100,
            discount: pricing.discountCents / 100,
            taxableAmount: pricing.taxableCents / 100,
            gstTotal: pricing.totalGstCents / 100,
            cgst: gstSplit.cgstCents / 100,
            sgst: gstSplit.sgstCents / 100,
            igst: gstSplit.igstCents / 100,
            gstType: gstSplit.type,
            shipping: shippingCents / 100,
            grandTotal: grandTotalCents / 100,
            items: pricing.lines.map(l => ({
                id: l.dbProduct.id,
                name: l.dbProduct.name,
                sku: l.dbProduct.sku || `SKU-${l.dbProduct.id.slice(0, 8)}`,
                price: l.unitCents / 100,
                quantity: l.quantity,
                lineTotal: l.lineCents / 100,
                discountAllocated: l.discountCents / 100,
                taxable: l.taxableCents / 100,
                gstRate: l.gstRate,
                gstAmount: l.gstCents / 100
            }))
        });
    } catch (err) {
        console.error('❌ [OFFLINE_INVOICE] Quote error:', err);
        res.status(500).json({ error: 'Calculation failed', message: err.message });
    }
});

/**
 * POST /
 * Create Offline Invoice (DB Transaction + Sequence + Audit Log).
 */
router.post('/', requireWritePermission, async (req, res) => {
    const { idempotencyKey } = req.body;

    // 1. Idempotency Guard
    if (idempotencyKey) {
        const existingRes = await db.query(
            'SELECT * FROM orders WHERE idempotency_key = $1',
            [String(idempotencyKey)]
        );
        if (existingRes.rows.length > 0) {
            console.log(`ℹ️ [OFFLINE_INVOICE] Duplicate submission intercepted for key: ${idempotencyKey}`);
            return res.status(200).json({
                success: true,
                order: mapOrderRowToDTO(existingRes.rows[0]),
                alreadyProcessed: true
            });
        }
    }

    // 2. Connect DB Client for Transaction
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 3. Validate & Price
        const validation = await validateInvoicePayload(client, req.body);
        if (!validation.valid) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, errors: validation.errors });
        }

        const { pricing, gstSplit, shippingCents, grandTotalCents, amountPaidCents } = validation;
        const fyPeriod = getFinancialYear();
        const series = 'OFF-INV';

        // 4. Atomic Sequence Increment in DB
        const seqRes = await client.query(`
            INSERT INTO invoice_sequences (series, period, last_value)
            VALUES ($1, $2, 1)
            ON CONFLICT (series, period)
            DO UPDATE SET last_value = invoice_sequences.last_value + 1, updated_at = NOW()
            RETURNING last_value
        `, [series, fyPeriod]);

        const seqNumber = seqRes.rows[0].last_value;
        const invoiceNumber = formatInvoiceNumber(series, fyPeriod, seqNumber);
        const invoiceDate = new Date();

        // Prepare line items JSON for storage
        const storedItems = pricing.lines.map(l => ({
            id: l.dbProduct.id,
            name: l.dbProduct.name,
            sku: l.dbProduct.sku || `SKU-${l.dbProduct.id.slice(0, 8)}`,
            price: l.unitCents / 100,
            quantity: l.quantity,
            line_total: l.lineCents / 100,
            discount_allocated: l.discountCents / 100,
            taxable_amount: l.taxableCents / 100,
            gst_rate: l.gstRate,
            gst_amount: l.gstCents / 100,
            image: l.dbProduct.image,
            category: l.dbProduct.category,
            selectedVariant: l.variant ? { weight: l.variant.weight, price: l.variant.price } : undefined,
            customizationData: l.item.customizationData
        }));

        const {
            customerName,
            customerEmail,
            customerPhone,
            customerCompany,
            customerGstin,
            placeOfSupply,
            billingAddress,
            shippingAddress,
            paymentStatus,
            paymentMethod,
            paymentReference,
            notes
        } = req.body;

        const createdBy = req.adminUser?.username || req.adminUser?.id || 'admin';
        const effectiveShippingAddress = shippingAddress || billingAddress;

        // 5. INSERT into orders table
        const insertRes = await client.query(`
            INSERT INTO orders (
                source, invoice_number, invoice_date, status,
                customer_name, customer_email, customer_phone, customer_company, customer_gstin, place_of_supply,
                address, city, state, pincode, billing_address,
                payment_status, payment_method, payment_reference, amount_paid,
                total, subtotal_server, shipping_server, total_server, total_gst_server,
                discount_server, taxable_amount_server, cgst_server, sgst_server, igst_server,
                items, notes, created_by, idempotency_key
            ) VALUES (
                'offline', $1, $2, 'Processing',
                $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13,
                $14, $15, $16, $17,
                $18, $19, $20, $21, $22,
                $23, $24, $25, $26, $27,
                $28, $29, $30, $31
            ) RETURNING *
        `, [
            invoiceNumber, invoiceDate,
            customerName.trim(), (customerEmail || '').trim().toLowerCase(), customerPhone.trim(), customerCompany ? customerCompany.trim() : null, customerGstin ? customerGstin.trim().toUpperCase() : null, placeOfSupply,
            effectiveShippingAddress.address, effectiveShippingAddress.city, effectiveShippingAddress.state, effectiveShippingAddress.pincode, JSON.stringify(billingAddress),
            paymentStatus, paymentMethod, paymentReference ? paymentReference.trim() : null, amountPaidCents / 100,
            grandTotalCents / 100, pricing.subtotalCents / 100, shippingCents / 100, grandTotalCents / 100, pricing.totalGstCents / 100,
            pricing.discountCents / 100, pricing.taxableCents / 100, gstSplit.cgstCents / 100, gstSplit.sgstCents / 100, gstSplit.igstCents / 100,
            JSON.stringify(storedItems), notes ? notes.trim() : null, createdBy, idempotencyKey ? String(idempotencyKey) : null
        ]);

        const orderRow = insertRes.rows[0];

        // 6. Log Audit Trail
        await client.query(`
            INSERT INTO public.admin_audit_logs (admin_id, action, resource, resource_id, metadata, ip_address, role, user_agent)
            VALUES ($1, 'CREATE', 'offline_invoice', $2, $3, $4, $5, $6)
        `, [
            createdBy,
            orderRow.id,
            JSON.stringify({ invoiceNumber, grandTotal: grandTotalCents / 100, paymentStatus }),
            req.ip,
            req.adminRole || 'ADMIN',
            req.headers['user-agent'] || 'N/A'
        ]);

        await client.query('COMMIT');
        console.log(`✅ [OFFLINE_INVOICE] Created invoice ${invoiceNumber} (ID: ${orderRow.id})`);

        res.status(201).json({
            success: true,
            order: mapOrderRowToDTO(orderRow)
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ [OFFLINE_INVOICE] Creation transaction failed:', err);
        res.status(500).json({ error: 'Failed to create offline invoice', message: err.message });
    } finally {
        client.release();
    }
});

/**
 * GET /:id
 * Fetch offline invoice by order ID.
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT * FROM orders WHERE id = $1 AND source = \'offline\'',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Offline invoice not found' });
        }
        res.json({ success: true, order: mapOrderRowToDTO(result.rows[0]) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PATCH /:id/payment
 * Update payment details for an offline invoice (Line items are locked).
 */
router.patch('/:id/payment', requireWritePermission, async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus, paymentMethod, paymentReference, amountPaid } = req.body;

        const checkRes = await db.query('SELECT * FROM orders WHERE id = $1 AND source = \'offline\'', [id]);
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ error: 'Offline invoice not found' });
        }

        const existing = checkRes.rows[0];
        const grandTotal = Number(existing.total);

        const validStatuses = ['Paid', 'Pending', 'Partial'];
        if (paymentStatus && !validStatuses.includes(paymentStatus)) {
            return res.status(400).json({ error: 'Invalid payment status' });
        }

        const validMethods = ['Cash', 'Bank Transfer', 'UPI', 'Other'];
        if (paymentMethod && !validMethods.includes(paymentMethod)) {
            return res.status(400).json({ error: 'Invalid payment method' });
        }

        const newStatus = paymentStatus || existing.payment_status;
        const newMethod = paymentMethod || existing.payment_method;
        const newRef = paymentReference !== undefined ? paymentReference : existing.payment_reference;

        let newAmountPaid = Number(existing.amount_paid);
        if (newStatus === 'Paid') {
            newAmountPaid = grandTotal;
        } else if (newStatus === 'Pending') {
            newAmountPaid = 0;
        } else if (newStatus === 'Partial') {
            const num = Number(amountPaid !== undefined ? amountPaid : existing.amount_paid);
            if (isNaN(num) || num <= 0 || num >= grandTotal) {
                return res.status(400).json({ error: 'Amount paid for Partial status must be between 0 and Grand Total' });
            }
            newAmountPaid = num;
        }

        const updateRes = await db.query(`
            UPDATE orders SET
                payment_status = $1,
                payment_method = $2,
                payment_reference = $3,
                amount_paid = $4
            WHERE id = $5 AND source = 'offline'
            RETURNING *
        `, [newStatus, newMethod, newRef, newAmountPaid, id]);

        res.json({
            success: true,
            order: mapOrderRowToDTO(updateRes.rows[0])
        });

    } catch (err) {
        res.status(500).json({ error: 'Failed to update payment status', message: err.message });
    }
});

/**
 * Map DB row to DTO for frontend consumption
 */
const mapOrderRowToDTO = (row) => {
    let items = row.items;
    if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = []; }
    }

    let billingAddress = row.billing_address;
    if (typeof billingAddress === 'string') {
        try { billingAddress = JSON.parse(billingAddress); } catch (e) { billingAddress = null; }
    }

    return {
        id: row.id,
        source: row.source || 'website',
        invoiceNumber: row.invoice_number,
        invoiceDate: row.invoice_date || row.created_at,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        customerPhone: row.customer_phone,
        customerCompany: row.customer_company,
        customerGstin: row.customer_gstin,
        placeOfSupply: row.place_of_supply,
        address: row.address,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        billingAddress: billingAddress || {
            address: row.address,
            city: row.city,
            state: row.state,
            pincode: row.pincode
        },
        paymentStatus: row.payment_status || 'Paid',
        paymentMethod: row.payment_method || 'Prepaid (Razorpay)',
        paymentReference: row.payment_reference,
        amountPaid: parseFloat(row.amount_paid || row.total || 0),
        status: row.status,
        date: row.created_at,
        total: parseFloat(row.total || 0),
        subtotal_server: parseFloat(row.subtotal_server || 0),
        discount_server: parseFloat(row.discount_server || 0),
        taxable_amount_server: parseFloat(row.taxable_amount_server || 0),
        shipping_server: parseFloat(row.shipping_server || 0),
        total_gst_server: parseFloat(row.total_gst_server || 0),
        cgst_server: parseFloat(row.cgst_server || 0),
        sgst_server: parseFloat(row.sgst_server || 0),
        igst_server: parseFloat(row.igst_server || 0),
        items: Array.isArray(items) ? items : [],
        notes: row.notes,
        createdBy: row.created_by
    };
};

module.exports = router;
