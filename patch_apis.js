const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

// --- 1. PATCH POST /api/products ---
// Extract sku
code = code.replace(
    /customizableTag, originalPrice, campaignTag\s*} = req\.body;/,
    'customizableTag, originalPrice, campaignTag, sku } = req.body;'
);

// Add sku to INSERT query
code = code.replace(
    'max_file_size, allowed_file_types, customizable_tag, original_price, campaign_tag',
    'max_file_size, allowed_file_types, customizable_tag, original_price, campaign_tag, sku'
);

code = code.replace(
    '$35, $36, $37, $38, $39',
    '$35, $36, $37, $38, $39, $40'
);

// Add sku to INSERT values
code = code.replace(
    /originalPrice !== undefined.*? \? parseFloat\(originalPrice\) : null,\s*campaignTag \|\| null\s*\]\);/s,
    `originalPrice !== undefined && originalPrice !== null && originalPrice !== "" && !isNaN(parseFloat(originalPrice)) ? parseFloat(originalPrice) : null,
            campaignTag || null,
            sku || null
        ]);`
);

// Catch duplicate error in POST
code = code.replace(
    /app\.post\('\/api\/products'.*?RETURNING \*\n\s*`, \[[\s\S]*?\]\);([\s\S]*?res\.json\(\{ success: true, data: result\.rows\[0\] \}\);[\s\S]*?)catch \(err\) \{/g,
    function(match) {
        if (!match.includes('23505')) {
            return match.replace('catch (err) {', `catch (err) {
        if (err.code === '23505' && err.constraint === 'products_sku_key') {
            return res.status(400).json({ success: false, error: 'A product with this SKU already exists.' });
        }`);
        }
        return match;
    }
);


// --- 2. PATCH PUT /api/products/:id ---
// Extract sku (we already did this for POST, but PUT has its own destructuring block)
code = code.replace(
    /isCustomizable, customizationCharge, allowImageUpload, allowCustomText, allowSpecialInstructions, maxTextLength, maxFileSize, allowedFileTypes, customizableTag, originalPrice, campaignTag\s*} = req\.body;/g,
    'isCustomizable, customizationCharge, allowImageUpload, allowCustomText, allowSpecialInstructions, maxTextLength, maxFileSize, allowedFileTypes, customizableTag, originalPrice, campaignTag, sku } = req.body;'
);

// Add sku to UPDATE query
code = code.replace(
    'allowed_file_types = $37, customizable_tag = $38, original_price = $39, campaign_tag = $40',
    'allowed_file_types = $37, customizable_tag = $38, original_price = $39, campaign_tag = $40, sku = $41'
);

// Add sku to UPDATE values
code = code.replace(
    /originalPrice !== undefined.*? \? parseFloat\(originalPrice\) : null,\s*campaignTag \|\| null\s*\]\);/g,
    `originalPrice !== undefined && originalPrice !== null && originalPrice !== "" && !isNaN(parseFloat(originalPrice)) ? parseFloat(originalPrice) : null,
            campaignTag || null,
            sku || null
        ]);`
);

// Catch duplicate error in PUT
code = code.replace(
    /app\.put\('\/api\/products\/:id'.*?RETURNING \*\n\s*`, \[[\s\S]*?\]\);([\s\S]*?res\.json\(data\);[\s\S]*?)catch \(err\) \{/g,
    function(match) {
        if (!match.includes('23505')) {
            return match.replace('catch (err) {', `catch (err) {
        if (err.code === '23505' && err.constraint === 'products_sku_key') {
            return res.status(400).json({ error: 'A product with this SKU already exists.' });
        }`);
        }
        return match;
    }
);


// --- 3. ADD GET /api/products/sku/:sku ---
const skuRoute = `
// SKU SEARCH ENDPOINT
app.get('/api/products/sku/:sku', async (req, res) => {
    try {
        const sku = req.params.sku.trim();
        if (!sku) return res.status(400).json({ error: 'SKU is required' });

        const result = await db.query(
            \`SELECT id, name, image, price, category, is_live, slug, variants
             FROM products 
             WHERE LOWER(sku) = LOWER($1) AND is_live = TRUE
             LIMIT 1\`,
            [sku]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching product by SKU:', err);
        res.status(500).json({ error: 'Failed to fetch product by SKU' });
    }
});
`;

if (!code.includes('/api/products/sku/:sku')) {
    const productsGetRoute = code.indexOf("app.get('/api/products',");
    if (productsGetRoute !== -1) {
        code = code.substring(0, productsGetRoute) + skuRoute + '\n' + code.substring(productsGetRoute);
    }
}

fs.writeFileSync('server/index.js', code);
console.log('APIs patched in server/index.js');
