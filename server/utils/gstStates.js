/**
 * GST State Codes & GSTIN validation helpers.
 *
 * Single source of truth for state codes used by the Offline Invoice feature
 * (Place of Supply dropdown, GSTIN ↔ Place of Supply consistency checks and
 * CGST/SGST vs IGST determination). Exposed to the admin UI via
 * GET /api/admin/offline-invoices/meta so the list is never duplicated on the client.
 */

// Seller (Kottravai Enterprises Pvt Ltd) home state — GSTIN 33AALCK4299D1ZD
const SELLER_STATE = 'Tamil Nadu';
const SELLER_STATE_CODE = '33';

// Official GST state codes. Some states have legacy + current codes.
const GST_STATES = [
    { code: '01', name: 'Jammu and Kashmir' },
    { code: '02', name: 'Himachal Pradesh' },
    { code: '03', name: 'Punjab' },
    { code: '04', name: 'Chandigarh' },
    { code: '05', name: 'Uttarakhand' },
    { code: '06', name: 'Haryana' },
    { code: '07', name: 'Delhi' },
    { code: '08', name: 'Rajasthan' },
    { code: '09', name: 'Uttar Pradesh' },
    { code: '10', name: 'Bihar' },
    { code: '11', name: 'Sikkim' },
    { code: '12', name: 'Arunachal Pradesh' },
    { code: '13', name: 'Nagaland' },
    { code: '14', name: 'Manipur' },
    { code: '15', name: 'Mizoram' },
    { code: '16', name: 'Tripura' },
    { code: '17', name: 'Meghalaya' },
    { code: '18', name: 'Assam' },
    { code: '19', name: 'West Bengal' },
    { code: '20', name: 'Jharkhand' },
    { code: '21', name: 'Odisha' },
    { code: '22', name: 'Chhattisgarh' },
    { code: '23', name: 'Madhya Pradesh' },
    { code: '24', name: 'Gujarat' },
    { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu', altCodes: ['25'] },
    { code: '27', name: 'Maharashtra' },
    { code: '29', name: 'Karnataka' },
    { code: '30', name: 'Goa' },
    { code: '31', name: 'Lakshadweep' },
    { code: '32', name: 'Kerala' },
    { code: '33', name: 'Tamil Nadu' },
    { code: '34', name: 'Puducherry' },
    { code: '35', name: 'Andaman and Nicobar Islands' },
    { code: '36', name: 'Telangana' },
    { code: '37', name: 'Andhra Pradesh', altCodes: ['28'] },
    { code: '38', name: 'Ladakh' },
    { code: '97', name: 'Other Territory' },
];

const normalizeState = (s) => String(s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z]/g, '');

// Common aliases so legacy free-text state names still resolve.
const STATE_ALIASES = {
    orissa: 'Odisha',
    pondicherry: 'Puducherry',
    newdelhi: 'Delhi',
    nctofdelhi: 'Delhi',
    tamilnadu: 'Tamil Nadu',
    andamanandnicobar: 'Andaman and Nicobar Islands',
    damananddiu: 'Dadra and Nagar Haveli and Daman and Diu',
    dadraandnagarhaveli: 'Dadra and Nagar Haveli and Daman and Diu',
};

/** Resolve a free-text state name to a canonical GST state entry (or null). */
const findState = (name) => {
    const n = normalizeState(name);
    if (!n) return null;
    const aliased = STATE_ALIASES[n];
    const target = aliased ? normalizeState(aliased) : n;
    return GST_STATES.find(s => normalizeState(s.name) === target) || null;
};

/** Resolve a 2-digit GST state code to a state entry (or null). */
const findStateByCode = (code) => {
    const c = String(code || '').padStart(2, '0');
    return GST_STATES.find(s => s.code === c || (s.altCodes || []).includes(c)) || null;
};

const isIntraState = (placeOfSupply) => {
    const st = findState(placeOfSupply);
    return !!st && st.code === SELLER_STATE_CODE;
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** GSTIN check digit (Luhn mod-36). Verified against 33AALCK4299D1ZD. */
const gstinCheckChar = (first14) => {
    let factor = 2;
    let sum = 0;
    for (let i = first14.length - 1; i >= 0; i--) {
        let addend = factor * GSTIN_CHARS.indexOf(first14[i]);
        factor = factor === 2 ? 1 : 2;
        addend = Math.floor(addend / 36) + (addend % 36);
        sum += addend;
    }
    return GSTIN_CHARS[(36 - (sum % 36)) % 36];
};

/**
 * Validate a GSTIN.
 * @returns {{ valid: boolean, error?: string, state?: object }}
 */
const validateGstin = (gstin) => {
    const g = String(gstin || '').trim().toUpperCase();
    if (!GSTIN_REGEX.test(g)) {
        return { valid: false, error: 'GSTIN format is invalid (expected 15 characters, e.g. 33AALCK4299D1ZD)' };
    }
    if (gstinCheckChar(g.slice(0, 14)) !== g[14]) {
        return { valid: false, error: 'GSTIN checksum is invalid — please re-check the number' };
    }
    const state = findStateByCode(g.slice(0, 2));
    if (!state) {
        return { valid: false, error: `GSTIN state code ${g.slice(0, 2)} is not a valid Indian state code` };
    }
    return { valid: true, state, gstin: g };
};

module.exports = {
    SELLER_STATE,
    SELLER_STATE_CODE,
    GST_STATES,
    findState,
    findStateByCode,
    isIntraState,
    validateGstin,
};
