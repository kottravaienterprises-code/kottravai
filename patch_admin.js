const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

// 1. Add sku to formData state
if (!code.includes('sku: "",')) {
    code = code.replace(
        'name: "",',
        'name: "",\n    sku: "",'
    );
}

// 2. Add sku to editProduct
if (!code.includes('sku: product.sku || "",')) {
    code = code.replace(
        'name: product.name,',
        'name: product.name,\n      sku: product.sku || "",'
    );
}

// 3. Add sku to handleSubmit payload
if (!code.includes('sku: formData.sku || null,')) {
    code = code.replace(
        'name: formData.name,',
        'name: formData.name,\n        sku: formData.sku || null,'
    );
}

// 4. Add SKU input field in JSX
const skuInput = `
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">
                      SKU (Stock Keeping Unit)
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData({ ...formData, sku: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none transition-all"
                      placeholder="e.g., KT-CS-001"
                    />
                  </div>
`;

if (!code.includes('SKU (Stock Keeping Unit)')) {
    const insertPoint = code.indexOf('<div className="space-y-2">\n                    <label className="text-sm font-bold text-gray-700">\n                      Product Name');
    if (insertPoint !== -1) {
        code = code.substring(0, insertPoint) + skuInput + code.substring(insertPoint);
    } else {
        console.error("Could not find product name input to insert SKU");
    }
}

// 5. Optionally add SKU to product display list. Let's check where products are mapped.
// Search for `product.name` display
code = code.replace(
    /<h3 className="font-bold text-gray-900 truncate">(.*?)<\/h3>/,
    `<h3 className="font-bold text-gray-900 truncate">$1</h3>
                        {product.sku && <p className="text-xs text-gray-500 font-mono">SKU: {product.sku}</p>}`
);


fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', code);
console.log('Patched AdminDashboard.tsx');
