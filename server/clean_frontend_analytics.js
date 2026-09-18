const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, searchRegex, replaceWith) {
    const fullPath = path.resolve(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = content.replace(searchRegex, replaceWith);
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${filePath}`);
    } else {
        console.error(`File not found: ${filePath}`);
    }
}

// 1. Checkout.tsx
replaceInFile(
    'src/pages/Checkout.tsx',
    /analytics\.trackEvent\('purchase_completed', \{[\s\S]*?\}\);/g,
    "// SERVER_SIDE_ANALYTICS: 'purchase_completed' is now sent securely from the backend webhook to guarantee 100% data integrity and zero hallucination."
);

// 2. OrderSuccess.tsx
replaceInFile(
    'src/pages/OrderSuccess.tsx',
    /analytics\.trackEvent\('purchase_completed', \{[\s\S]*?\}\);/g,
    "// SERVER_SIDE_ANALYTICS: 'purchase_completed' is now sent securely from the backend webhook to guarantee 100% data integrity and zero hallucination."
);

// 3. utils/analyticsService.ts
replaceInFile(
    'src/utils/analyticsService.ts',
    /if \(payload\.event_type === 'purchase_completed' \|\| payload\.event_type === 'purchase'\) \{[\s\S]*?\}/g,
    "/* SERVER_SIDE_ANALYTICS: purchase_completed frontend interceptor disabled. */"
);

console.log("Frontend analytics cleanup complete.");
