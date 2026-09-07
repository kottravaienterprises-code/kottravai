const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

c = c.replaceAll(
    'maxFileSize, allowedFileTypes, customizableTag\n        } = req.body;',
    'maxFileSize, allowedFileTypes, customizableTag, originalPrice\n        } = req.body;'
);

c = c.replaceAll(
    "customizableTag || 'CUSTOMIZABLE'\n        ]);",
    "customizableTag || 'CUSTOMIZABLE',\n            originalPrice && !isNaN(parseFloat(originalPrice)) ? parseFloat(originalPrice) : null\n        ]);"
);

fs.writeFileSync('server/index.js', c);
