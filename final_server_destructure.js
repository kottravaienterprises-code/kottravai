const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

c = c.replace(
    'maxFileSize, allowedFileTypes, customizableTag\n        } = req.body;',
    'maxFileSize, allowedFileTypes, customizableTag, originalPrice, campaignTag\n        } = req.body;'
);

c = c.replace(
    'maxFileSize, allowedFileTypes, customizableTag, originalPrice\n        } = req.body;',
    'maxFileSize, allowedFileTypes, customizableTag, originalPrice, campaignTag\n        } = req.body;'
);

fs.writeFileSync('server/index.js', c);
