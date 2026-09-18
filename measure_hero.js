const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle2' });

    const viewports = [375, 768, 1024, 1280, 1440, 1536, 1920];
    const results = [];

    for (const width of viewports) {
        let height = 1080;
        if (width === 375) height = 667;
        if (width === 768) height = 1024;
        if (width === 1024) height = 768;
        
        await page.setViewport({ width, height });
        await new Promise(resolve => setTimeout(resolve, 500));

        const data = await page.evaluate((w, h) => {
            const hero = document.querySelector('.hero-section-container');
            if (!hero) return null;
            
            const rect = hero.getBoundingClientRect();
            const img = hero.querySelector('img');
            const imgRect = img ? img.getBoundingClientRect() : null;

            return {
                viewport: w,
                viewportHeight: h,
                width: rect.width,
                height: rect.height,
                imgWidth: imgRect ? imgRect.width : 0,
                imgHeight: imgRect ? imgRect.height : 0
            };
        }, width, height);
        
        if (data) {
            results.push(data);
        }
    }

    console.log("==========================================");
    console.log("| Viewport | Hero Width | Hero Height | Required Aspect Ratio |");
    console.log("|----------|------------|-------------|-----------------------|");
    for (const r of results) {
        const ratio = (r.width / r.height).toFixed(3);
        console.log(`| ${r.viewport.toString().padEnd(8)} | ${r.width.toString().padEnd(10)} | ${r.height.toString().padEnd(11)} | ${ratio.padEnd(21)} |`);
    }

    console.log("\nDetails:");
    for (const r of results) {
        console.log(`\nViewport: ${r.viewport}px\nViewport height: ${r.viewportHeight}px\nHero: width: ${r.width}px, height: ${r.height}px, aspect ratio: ${(r.width / r.height).toFixed(3)}\nHero image: width: ${r.imgWidth}px, height: ${r.imgHeight}px, aspect ratio: ${r.imgHeight ? (r.imgWidth / r.imgHeight).toFixed(3) : 0}`);
    }

    await browser.close();
})();
