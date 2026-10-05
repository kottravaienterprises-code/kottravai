const fs = require('fs');

const file = 'src/pages/Shop.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `    // Sort Logic
    const sortedProducts = isSearchMode
        ? [...filteredProducts]
        : [...filteredProducts].sort((a, b) => {`;

const replace = `    // Sort Logic
    let sortedProducts = isSearchMode
        ? [...filteredProducts]
        : [...filteredProducts].sort((a, b) => {`;

content = content.replace(target, replace);

const target2 = `            if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
            return 0;
        });

    const getDisplayName = (product: any) => product.product_name || product.productName || product.title || product.name || 'Product';`;

const replace2 = `            if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
            return 0;
        });

    if (!isSearchMode && sortBy === 'best-selling' && slug === 'coconut-shell-products') {
        const specialProductTerms = ['mobile holder', 'soap holder', 'quote stand', 'dhoop stand'];
        const specialProducts: any[] = [];
        const normalProducts: any[] = [];
        sortedProducts.forEach(p => {
            const name = (p.name || '').toLowerCase();
            if (specialProductTerms.some(term => name.includes(term))) {
                specialProducts.push(p);
            } else {
                normalProducts.push(p);
            }
        });
        
        const insertIndex = Math.min(8, normalProducts.length);
        sortedProducts = [
            ...normalProducts.slice(0, insertIndex),
            ...specialProducts,
            ...normalProducts.slice(insertIndex)
        ];
    }

    const getDisplayName = (product: any) => product.product_name || product.productName || product.title || product.name || 'Product';`;

content = content.replace(target2, replace2);

fs.writeFileSync(file, content);
console.log("Patched successfully");
