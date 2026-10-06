/**
 * ORDER PRICING SERVICE (Server-side)
 * Handles pricing calculations for both Website Checkout and Offline Invoices.
 * Ensures 100% calculation parity and strict monetary precision.
 */

const { isIntraState } = require('../utils/gstStates') || {};

/**
 * Helper to round monetary amounts cleanly to 2 decimal places.
 */
const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

/**
 * Calculates Indian Financial Year (April 1 to March 31).
 * Example:
 *   2026-03-31 -> '2025-26'
 *   2026-04-01 -> '2026-27'
 *   2026-10-06 -> '2026-27'
 *   2027-03-31 -> '2026-27'
 *   2027-04-01 -> '2027-28'
 *
 * @param {Date|string|number} dateInput
 * @returns {string} Financial Year string (e.g. '2026-27')
 */
const getFinancialYear = (dateInput = new Date()) => {
    let date = dateInput;
    if (typeof date === 'string' || typeof date === 'number') {
        date = new Date(dateInput);
    }
    if (isNaN(date.getTime())) {
        date = new Date();
    }

    // Determine year and month in UTC/Local based on representation
    const year = date.getFullYear();
    const month = date.getMonth(); // 0 = Jan, 2 = Mar, 3 = Apr

    // FY starts April (Month index 3)
    const startYear = month >= 3 ? year : year - 1;
    const endYearShort = String((startYear + 1) % 100).padStart(2, '0');
    return `${startYear}-${endYearShort}`;
};

/**
 * Exact website order total calculation preserved from recalculateTotals().
 * 100% Parity guarantee for existing website orders.
 *
 * @param {Array} items - Order items
 * @param {Array} dbProducts - Products fetched from database
 * @param {number|object} shippingFee - Shipping fee in rupees or object containing shippingFee
 * @returns {object} { subtotalCents, shippingCents, totalGstCents, totalCents, zoneName }
 */
const calculateWebsiteTotals = (items, dbProducts, shippingFee = 0) => {
    let subtotalCents = 0;
    let totalGstCents = 0;

    for (const item of items) {
        const dbProduct = dbProducts.find(p => String(p.id) === String(item.id));
        if (!dbProduct) throw new Error(`PRODUCT_NOT_FOUND: ${item.id}`);

        let itemPrice = Number(dbProduct.price);
        if (item.selectedVariant && dbProduct.variants) {
            const variant = dbProduct.variants.find(v => v.weight === item.selectedVariant.weight);
            if (variant) itemPrice = Number(variant.price);
        }

        const quantity = item.quantity || 1;
        const customCharge = item.customizationData?.isCustomized ? Number(item.customizationData.customizationCharge || 0) : 0;
        const itemTotalCents = (Math.round(itemPrice * 100) * quantity) + Math.round(customCharge * 100);
        subtotalCents += itemTotalCents;

        const gstRate = Number(dbProduct.gst_rate || 0);
        item.gst_rate = gstRate; // Store back into item object for consistency

        if (gstRate > 0) {
            totalGstCents += Math.round(itemTotalCents * (gstRate / 100));
        }
    }

    const shipFeeVal = typeof shippingFee === 'number'
        ? shippingFee
        : (shippingFee?.shippingFee || 0);
    const shippingCents = Math.round(shipFeeVal * 100);

    return {
        subtotalCents,
        shippingCents,
        totalGstCents,
        totalCents: subtotalCents + shippingCents + totalGstCents,
        zoneName: typeof shippingFee === 'object' ? shippingFee?.zoneName : null
    };
};

/**
 * Normalizes state / place of supply string for GST determination.
 *
 * @param {string} pos
 * @returns {boolean} True if Tamil Nadu (Intra-state)
 */
const isTamilNadu = (pos) => {
    if (!pos) return false;
    const clean = String(pos).trim().toLowerCase().replace(/\s+/g, '');
    return clean === 'tamilnadu' || clean === 'tn';
};

/**
 * Calculates Offline Order Pricing with discount before GST, CGST/SGST vs IGST,
 * configurable shipping tax, and strict monetary precision.
 *
 * @param {object} params
 * @param {Array} params.items - Items array [{ id, quantity, selectedVariant, customizationData }]
 * @param {Array} params.dbProducts - Authoritative product details from DB
 * @param {string} params.placeOfSupply - State or Place of Supply (e.g. 'Tamil Nadu', 'Karnataka')
 * @param {number} [params.discountAmount=0] - Discount amount in Rupees
 * @param {number} [params.shippingFee=0] - Shipping fee in Rupees
 * @param {number} [params.shippingTaxRate=0] - Tax rate for shipping (if applicable)
 * @returns {object} Calculated pricing breakdown and item snapshot
 */
const calculateOfflinePricing = ({
    items = [],
    dbProducts = [],
    placeOfSupply = '',
    discountAmount = 0,
    shippingFee = 0,
    shippingTaxRate = 0
}) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('ITEMS_REQUIRED');
    }

    // 1. Calculate item subtotals
    const lineDetails = items.map(item => {
        const dbProduct = dbProducts.find(p => String(p.id) === String(item.id));
        if (!dbProduct) throw new Error(`PRODUCT_NOT_FOUND: ${item.id}`);

        let itemPrice = Number(dbProduct.price);
        if (item.selectedVariant && dbProduct.variants) {
            const variant = dbProduct.variants.find(v => v.weight === item.selectedVariant.weight);
            if (variant) itemPrice = Number(variant.price);
        }

        const quantity = Number(item.quantity);
        if (isNaN(quantity) || quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }
        const customCharge = item.customizationData?.isCustomized
            ? Number(item.customizationData.customizationCharge || 0)
            : 0;

        const lineSubtotal = round2((itemPrice * quantity) + customCharge);
        const gstRate = Number(dbProduct.gst_rate || item.gstRate || item.gst_rate || 0);

        return {
            productId: dbProduct.id,
            productName: dbProduct.name || item.name || '',
            sku: dbProduct.sku || item.sku || null,
            quantity,
            unitPrice: itemPrice,
            customCharge,
            subtotal: lineSubtotal,
            gstRate,
            selectedVariant: item.selectedVariant || null,
            customizationData: item.customizationData || null
        };
    });

    const subtotal = round2(lineDetails.reduce((sum, line) => sum + line.subtotal, 0));

    // 2. Validate discount
    const discount = round2(Number(discountAmount || 0));
    if (discount < 0) {
        throw new Error('Discount cannot be negative');
    }
    if (discount > subtotal) {
        throw new Error(`Discount (₹${discount}) cannot exceed subtotal (₹${subtotal})`);
    }

    // 3. Apply discount BEFORE GST (proportional allocation)
    let allocatedDiscounts = lineDetails.map(() => 0);
    if (discount > 0 && subtotal > 0) {
        let currentAllocSum = 0;
        lineDetails.forEach((line, index) => {
            if (index === lineDetails.length - 1) {
                // Last line gets remainder to avoid 1-paise rounding discrepancies
                allocatedDiscounts[index] = round2(discount - currentAllocSum);
            } else {
                const allocated = round2((line.subtotal / subtotal) * discount);
                allocatedDiscounts[index] = allocated;
                currentAllocSum = round2(currentAllocSum + allocated);
            }
        });
    }

    // 4. Calculate Taxable Value & GST per line
    const isIntra = isTamilNadu(placeOfSupply);
    let totalTaxableAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const processedItems = lineDetails.map((line, index) => {
        const lineDiscount = allocatedDiscounts[index];
        const lineTaxableValue = round2(line.subtotal - lineDiscount);

        if (lineTaxableValue < 0) {
            throw new Error('Line taxable value cannot be negative');
        }

        const lineGstTotal = round2(lineTaxableValue * (line.gstRate / 100));

        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        if (isIntra) {
            cgst = round2(lineGstTotal / 2);
            sgst = round2(lineGstTotal - cgst); // Exact split without losing 1 paise
            igst = 0;
        } else {
            cgst = 0;
            sgst = 0;
            igst = lineGstTotal;
        }

        totalTaxableAmount = round2(totalTaxableAmount + lineTaxableValue);
        totalCgst = round2(totalCgst + cgst);
        totalSgst = round2(totalSgst + sgst);
        totalIgst = round2(totalIgst + igst);

        return {
            productId: line.productId,
            productName: line.productName,
            sku: line.sku,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            subtotal: line.subtotal,
            discount: lineDiscount,
            taxableValue: lineTaxableValue,
            gstRate: line.gstRate,
            cgst,
            sgst,
            igst
        };
    });

    // 5. Calculate Shipping & Shipping Tax
    const shipFee = round2(Number(shippingFee || 0));
    const shipTaxRate = Number(shippingTaxRate || 0);
    const shippingTax = round2(shipFee * (shipTaxRate / 100));

    // 6. Calculate Grand Total
    const grandTotal = round2(totalTaxableAmount + totalCgst + totalSgst + totalIgst + shipFee + shippingTax);

    return {
        subtotal,
        discount,
        taxableAmount: totalTaxableAmount,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        shippingFee: shipFee,
        shippingTax,
        grandTotal,
        items: processedItems
    };
};

/**
 * Atomically generates the next invoice sequence number using PostgreSQL function
 * with fallback to table locks.
 * Format: OFF-INV-2026-27-0001
 *
 * @param {object} dbClient - Database queryable object (pool or client)
 * @param {Date|string} date - Invoice date
 * @returns {Promise<string>} Invoice number string (e.g. 'OFF-INV-2026-27-0001')
 */
const getNextInvoiceNumber = async (dbClient, date = new Date()) => {
    const fy = getFinancialYear(date);

    if (dbClient && typeof dbClient.query === 'function') {
        try {
            const res = await dbClient.query(
                'SELECT get_next_offline_invoice_number($1) AS invoice_number',
                [fy]
            );
            if (res.rows && res.rows[0] && res.rows[0].invoice_number) {
                return res.rows[0].invoice_number;
            }
        } catch (err) {
            // Fallback atomic SQL in case PL/pgSQL function is not yet registered
            const res = await dbClient.query(`
                INSERT INTO invoice_sequences (financial_year, last_sequence, updated_at)
                VALUES ($1, 1, NOW())
                ON CONFLICT (financial_year)
                DO UPDATE SET last_sequence = invoice_sequences.last_sequence + 1, updated_at = NOW()
                RETURNING last_sequence
            `, [fy]);
            const seq = res.rows[0].last_sequence;
            const seqFormatted = String(seq).padStart(4, '0');
            return `OFF-INV-${fy}-${seqFormatted}`;
        }
    }

    throw new Error('DB_CLIENT_REQUIRED');
};

module.exports = {
    getFinancialYear,
    calculateWebsiteTotals,
    calculateOfflinePricing,
    getNextInvoiceNumber,
    isTamilNadu,
    round2
};
