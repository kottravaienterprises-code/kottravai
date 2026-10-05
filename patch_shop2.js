const fs = require('fs');
let c = fs.readFileSync('src/pages/Shop.tsx', 'utf8');

c = c.replace(
    'const sortedProducts = isSearchMode',
    'let sortedProducts = isSearchMode'
);

const searchString1 = "if (sortBy === 'name-desc') return b.name.localeCompare(a.name);\n            return 0;\n        });\n\n    const getDisplayName";
const searchString2 = searchString1.replace(/\n/g, '\r\n');

const replacement = `if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
            return 0;
        });

    if (!isSearchMode && sortBy === 'best-selling' && slug === 'coconut-shell-products') {
        const specialProductTerms = ['mobile holder', 'soap holder', 'quote stand', 'dhoop stand'];
        const specialProducts = [];
        const normalProducts = [];
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

    const getDisplayName`;

c = c.replace(searchString1, replacement);
c = c.replace(searchString2, replacement);

fs.writeFileSync('src/pages/Shop.tsx', c);
console.log('Done replacement');
