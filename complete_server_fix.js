const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

// 1. In POST destructuring
c = c.replace(
    'maxFileSize, allowedFileTypes, customizableTag\n        } = req.body;',
    'maxFileSize, allowedFileTypes, customizableTag, originalPrice, campaignTag\n        } = req.body;'
);

// 2. In POST INSERT columns
c = c.replace(
    'max_text_length, max_file_size, allowed_file_types, customizable_tag, original_price',
    'max_text_length, max_file_size, allowed_file_types, customizable_tag, original_price, campaign_tag'
);

// 3. In POST INSERT VALUES
c = c.replace(
    '$29, $30, $31, $32, $33, $34, $35, $36, $37, $38',
    '$29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39'
);

// 4. In POST array arguments
c = c.replace(
    "customizableTag || 'CUSTOMIZABLE'\n        ]);",
    "customizableTag || 'CUSTOMIZABLE',\n            originalPrice && !isNaN(parseFloat(originalPrice)) ? parseFloat(originalPrice) : null,\n            campaignTag || null\n        ]);"
);

// 5. In PUT destructuring
c = c.replace(
    'maxFileSize, allowedFileTypes, customizableTag, originalPrice\n        } = req.body;',
    'maxFileSize, allowedFileTypes, customizableTag, originalPrice, campaignTag\n        } = req.body;'
);

// 6. In PUT UPDATE SET
c = c.replace(
    'max_file_size = $36, allowed_file_types = $37, customizable_tag = $38, original_price = $39',
    'max_file_size = $36, allowed_file_types = $37, customizable_tag = $38, original_price = $39, campaign_tag = $40'
);

// 7. In PUT array arguments
c = c.replace(
    "customizableTag || 'CUSTOMIZABLE',\n            originalPrice && !isNaN(parseFloat(originalPrice)) ? parseFloat(originalPrice) : null\n        ]);",
    "customizableTag || 'CUSTOMIZABLE',\n            originalPrice && !isNaN(parseFloat(originalPrice)) ? parseFloat(originalPrice) : null,\n            campaignTag || null\n        ]);"
);

fs.writeFileSync('server/index.js', c);
