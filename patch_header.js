const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

const oldFunc = `    const handleSearchSubmit = (e?: React.FormEvent | undefined) => {
        e?.preventDefault();
        const trimmedQuery = searchQuery.trim();

        if (!trimmedQuery) {
            resetSearchState();
            return;
        }

        analytics.trackEvent('search', {
            search_term: trimmedQuery,
            result_count: liveResults.length,
            is_live_search: false
        });

        console.log('[Header Search]', {
            submittedQuery: trimmedQuery,
            generatedUrl: \`/shop?q=\${encodeURIComponent(trimmedQuery)}\`
        });
        console.log({ stage: 'Header Search Input', count: trimmedQuery.length, sample: [trimmedQuery] });
        console.log({ stage: 'Router Navigation', count: 1, sample: [\`/shop?q=\${encodeURIComponent(trimmedQuery)}\`] });

        navigate(\`/shop?q=\${encodeURIComponent(trimmedQuery)}\`);
        resetSearchState();
    };`;

const newFunc = `    const handleSearchSubmit = async (e?: React.FormEvent | undefined) => {
        e?.preventDefault();
        const trimmedQuery = searchQuery.trim();

        if (!trimmedQuery) {
            resetSearchState();
            return;
        }

        analytics.trackEvent('search', {
            search_term: trimmedQuery,
            result_count: liveResults.length,
            is_live_search: false
        });

        // 1. Try SKU Search First
        try {
            const skuRes = await axios.get(\`/api/products/sku/\${encodeURIComponent(trimmedQuery)}\`);
            if (skuRes.data && skuRes.data.slug) {
                console.log('[Header Search] Direct SKU match found:', trimmedQuery);
                navigate(\`/product/\${skuRes.data.slug}\`);
                resetSearchState();
                return;
            }
        } catch (err: any) {
            // It's fine if it's 404, we just fall back to normal search
            if (err.response?.status !== 404) {
                console.error('[Header Search] SKU lookup error:', err);
            }
        }

        console.log('[Header Search]', {
            submittedQuery: trimmedQuery,
            generatedUrl: \`/shop?q=\${encodeURIComponent(trimmedQuery)}\`
        });
        console.log({ stage: 'Header Search Input', count: trimmedQuery.length, sample: [trimmedQuery] });
        console.log({ stage: 'Router Navigation', count: 1, sample: [\`/shop?q=\${encodeURIComponent(trimmedQuery)}\`] });

        navigate(\`/shop?q=\${encodeURIComponent(trimmedQuery)}\`);
        resetSearchState();
    };`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('src/components/Header.tsx', code);
console.log('Patched Header.tsx');
