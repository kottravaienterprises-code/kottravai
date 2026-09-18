const puppeteer = require('puppeteer');
const fs = require('fs');

async function runTest() {
    const browser = await puppeteer.launch({ channel: 'chrome' });
    const page = await browser.newPage();
    const artifactDir = 'C:/Users/santh/.gemini/antigravity/brain/3be4caf6-199f-488c-b10f-7831c24d4062';
    const viewports = [
        { width: 375, height: 812, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1280, height: 800, name: 'desktop' },
        { width: 1440, height: 900, name: 'desktop-lg' },
        { width: 1920, height: 1080, name: 'desktop-xl' }
    ];

    console.log('Navigating to local dev server...');
    try {
        await page.goto('http://localhost:4173', { waitUntil: 'networkidle0', timeout: 30000 });
    } catch (e) {
        console.error('Failed to load page', e);
        await browser.close();
        return;
    }

    for (let vp of viewports) {
        await page.setViewport({ width: vp.width, height: vp.height });
        await new Promise(r => setTimeout(r, 2000)); // wait for layout to settle

        console.log(`\n--- Measuring at ${vp.width}px ---`);
        
        const metrics = await page.evaluate(() => {
            const header = document.querySelector('header');
            
            // First child is the primary header (logo row)
            const primaryRow = header ? header.children[0] : null;
            
            // Third child is the main nav bar on desktop
            const navRow = header ? header.children[2] : null;
            
            const hero = document.querySelector('.hero-section-container');
            
            const headerRect = header ? header.getBoundingClientRect() : null;
            const primaryRect = primaryRow ? primaryRow.getBoundingClientRect() : null;
            const navRect = navRow ? navRow.getBoundingClientRect() : null;
            const heroRect = hero ? hero.getBoundingClientRect() : null;

            // Gap between hero and next section
            let gap = 0;
            if (heroRect) {
                const nextSibling = hero.nextElementSibling;
                if (nextSibling) {
                    const nextRect = nextSibling.getBoundingClientRect();
                    gap = nextRect.top - heroRect.bottom;
                }
            }

            return {
                headerTotalHeight: headerRect ? headerRect.height : 0,
                primaryHeaderHeight: primaryRect ? primaryRect.height : 0,
                navHeight: navRect ? navRect.height : 0,
                heroHeight: heroRect ? heroRect.height : 0,
                gapToNextSection: gap
            };
        });

        console.log(`Primary Header: ${metrics.primaryHeaderHeight}px`);
        console.log(`Category Nav: ${metrics.navHeight}px`);
        console.log(`Hero: ${metrics.heroHeight}px`);
        console.log(`Total Header Area: ${metrics.headerTotalHeight}px`);
        console.log(`Hero-to-content gap: ${metrics.gapToNextSection}px`);

        if (vp.width === 375 || vp.width === 1280) {
            const screenshotPath = `${artifactDir}/screenshot_${vp.width}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: false });
            console.log(`Saved screenshot to ${screenshotPath}`);
        }
    }

    await browser.close();
}

runTest().catch(console.error);
