const sharp = require('sharp');
const fs = require('fs');

async function processImages() {
    console.log('Processing banner 1...');
    // Banner 1
    const b1 = 'public/kottravai-banner-new.png';
    const b1_webp = 'public/kottravai-banner-new.webp';
    const b1_mob = 'public/kottravai-banner-new-mobile.webp';
    
    // Convert to WebP
    await sharp(b1).webp({ quality: 80 }).toFile(b1_webp);
    
    // Mobile crop (approx 750x640 for 2x retina mobile)
    await sharp(b1)
        .resize(750, 640, { fit: 'cover', position: 'right' }) // text/product usually centered or right
        .webp({ quality: 80 })
        .toFile(b1_mob);
        
    console.log('Processing banner 2...');
    // Banner 2
    const b2 = 'public/kottravai-banner.webp';
    const b2_mob = 'public/kottravai-banner-mobile.webp';
    await sharp(b2)
        .resize(750, 640, { fit: 'cover', position: 'center' })
        .webp({ quality: 80 })
        .toFile(b2_mob);
        
    console.log('Processing banner 3...');
    // Banner 3
    const b3 = 'public/uploads/2026/01/banner-2.webp';
    const b3_mob = 'public/uploads/2026/01/banner-2-mobile.webp';
    await sharp(b3)
        .resize(750, 640, { fit: 'cover', position: 'left' }) // "Crafted from Coconut" is often left-aligned
        .webp({ quality: 80 })
        .toFile(b3_mob);

    console.log('Done processing images.');
    
    // Print file sizes
    const files = [b1, b1_webp, b1_mob, b2, b2_mob, b3, b3_mob];
    files.forEach(f => {
        const stats = fs.statSync(f);
        console.log(`${f}: ${stats.size} bytes`);
    });
}

processImages().catch(console.error);
