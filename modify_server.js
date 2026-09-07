const fs = require('fs');
let lines = fs.readFileSync('server/index.js', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
    // 1. Destructuring POST/PUT
    if (lines[i].includes('customizableTag') && lines[i].includes('} = req.body;')) {
        lines[i] = lines[i].replace('customizableTag', 'customizableTag, originalPrice');
    }
    
    // 2. INSERT statement columns
    if (lines[i].includes('allowed_file_types, customizable_tag')) {
        lines[i] = lines[i].replace('customizable_tag', 'customizable_tag, original_price');
    }
    
    // 3. INSERT statement VALUES variables
    if (lines[i].includes('$29, $30, $31, $32, $33, $34, $35, $36, $37')) {
        lines[i] = lines[i].replace('$37', '$37, $38');
    }
    
    // 4. POST/PUT query array last item
    if (lines[i].includes("customizableTag || 'CUSTOMIZABLE'") && lines[i].includes(']')) {
        lines[i] = lines[i].replace("customizableTag || 'CUSTOMIZABLE'", "customizableTag || 'CUSTOMIZABLE',\n            originalPrice && !isNaN(parseFloat(originalPrice)) ? parseFloat(originalPrice) : null");
    }
    
    // 5. UPDATE statement SET
    if (lines[i].includes('customizable_tag = $38')) {
        lines[i] = lines[i].replace('customizable_tag = $38', 'customizable_tag = $38, original_price = $39');
    }
}

fs.writeFileSync('server/index.js', lines.join('\n'));
