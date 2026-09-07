const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');
c = c.replace(/customizableTag\n        \} = req\.body;/g, 'customizableTag, originalPrice\n        } = req.body;');
c = c.replace(/customizableTag \|\| 'CUSTOMIZABLE'\n        \]\);/g, "customizableTag || 'CUSTOMIZABLE',\n            originalPrice && !isNaN(parseFloat(originalPrice)) ? parseFloat(originalPrice) : null\n        ]);");
fs.writeFileSync('server/index.js', c);
