const fs = require('fs');
let c = fs.readFileSync('src/pages/Shop.tsx', 'utf8');

const start = c.indexOf('// Sort Logic');
const end = c.indexOf('const getDisplayName');

const replacement = `// Sort Logic
    let sortedProducts = isSearchMode
        ? [...filteredProducts]
        : [...filteredProducts].sort((a, b) => {
            if (sortBy === 'price-low') return Number(a.price) - Number(b.price);
            if (sortBy === 'price-high') return Number(b.price) - Number(a.price);
            if (sortBy === 'best-selling') return 0; // Backend handles this
            if (sortBy === 'newest') {
                const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
                const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
                return dateB - dateA;
            }
            if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
            if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
            return 0;
        });

    `;

c = c.substring(0, start) + replacement + c.substring(end);
fs.writeFileSync('src/pages/Shop.tsx', c);
console.log("Reverted Shop.tsx hardcoding");
