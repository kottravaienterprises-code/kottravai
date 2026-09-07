const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

c = c.replace(
    'allowedFileTypes, customizableTag\n        } = req.body;',
    'allowedFileTypes, customizableTag, originalPrice, campaignTag\n        } = req.body;'
);

fs.writeFileSync('server/index.js', c);
