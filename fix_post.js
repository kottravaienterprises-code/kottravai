const fs = require('fs');
let lines = fs.readFileSync('server/index.js', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('allowedFileTypes, customizableTag') && lines[i].includes('image_alts, imageAlts')) {
        if (!lines[i].includes('originalPrice')) {
            lines[i] = lines[i].replace('customizableTag', 'customizableTag, originalPrice, campaignTag');
        }
    }
}

fs.writeFileSync('server/index.js', lines.join('\n'));
