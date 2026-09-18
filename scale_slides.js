const sharp = require('sharp');
const fs = require('fs');
const config = [
    { s: 'public/Untitled design.png', d: 'slide1' },
    { s: 'public/c31dcce2-bd6e-46e7-92fd-3001a6a0178b.png', d: 'slide2' },
    { s: 'public/Untitled design (1).png', d: 'slide3' }
];

Promise.all(config.map(async c => {
    // Only pass width to maintain aspect ratio
    await sharp(c.s).resize(1920).webp().toFile('public/' + c.d + '-desktop.webp');
    await sharp(c.s).resize(1024).webp().toFile('public/' + c.d + '-tablet.webp');
    await sharp(c.s).resize(750).webp().toFile('public/' + c.d + '-mobile.webp');
    console.log('Processed ' + c.d);
})).catch(console.error);
