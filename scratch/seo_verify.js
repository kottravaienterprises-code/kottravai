const puppeteer = require('puppeteer');
const fs = require('fs');

async function crawl() {
    const browser = await puppeteer.launch({ headless: 'new' });
    const BASE_URL = 'https://www.kottravai.in';
    const urls = [
        '/',
        '/shop',
        '/category/food',
        '/category/home-decor',
        '/category/personal-care',
        '/product/coconut-shell-bowl',
        '/product/cold-pressed-coconut-oil',
        '/product/neem-wood-comb',
        '/product/handmade-soap',
        '/product/bamboo-toothbrush',
        '/b2b',
        '/about',
        '/contact',
        '/blog',
        '/blog/sustainable-living',
        '/blog/benefits-of-neem-wood',
        '/this-url-does-not-exist-404'
    ];

    const results = {};
    let total200 = 0, total3xx = 0, total4xx = 0, total5xx = 0;

    for (const urlPath of urls) {
        const url = BASE_URL + urlPath;
        console.log('Crawling ' + url);
        try {
            const page = await browser.newPage();
            
            let status = 0;
            const response = await page.goto(url, { waitUntil: 'networkidle2' });
            if (response) {
                status = response.status();
                const chain = response.request().redirectChain();
                if (chain.length > 0) {
                    // It was redirected
                    console.log(`Redirected: ${url} -> ${response.url()} (${chain[0].response().status()})`);
                }
            }
            
            if (status >= 200 && status < 300) total200++;
            else if (status >= 300 && status < 400) total3xx++;
            else if (status >= 400 && status < 500) total4xx++;
            else if (status >= 500) total5xx++;

            const data = await page.evaluate(() => {
                const title = document.title;
                const metaDesc = document.querySelector('meta[name="description"]')?.content || null;
                const h1 = document.querySelector('h1')?.innerText || null;
                const canonical = document.querySelector('link[rel="canonical"]')?.href || null;
                const robots = document.querySelector('meta[name="robots"]')?.content || null;
                
                // Structured data
                const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                const jsonld = scripts.map(s => {
                    try {
                        return JSON.parse(s.innerHTML);
                    } catch (e) { return null; }
                }).filter(Boolean);

                return { title, metaDesc, h1, canonical, robots, jsonld };
            });

            results[urlPath] = {
                status,
                ...data
            };
            await page.close();
        } catch (err) {
            console.error(`Error on ${url}: ${err.message}`);
        }
    }
    
    // Fetch robots.txt
    let robotsTxt = 'NOT FOUND';
    try {
        const page = await browser.newPage();
        const resp = await page.goto(BASE_URL + '/robots.txt');
        if (resp && resp.status() === 200) {
            robotsTxt = await page.evaluate(() => document.body.innerText);
        }
        await page.close();
    } catch (e) {}

    // Fetch sitemap.xml
    let sitemapXml = 'NOT FOUND';
    try {
        const page = await browser.newPage();
        const resp = await page.goto(BASE_URL + '/sitemap.xml');
        if (resp && resp.status() === 200) {
            sitemapXml = await page.evaluate(() => document.body.innerText);
        }
        await page.close();
    } catch (e) {}

    fs.writeFileSync('scratch/seo_results.json', JSON.stringify({
        robotsTxt,
        sitemapXml,
        results,
        counts: { total200, total3xx, total4xx, total5xx }
    }, null, 2));

    await browser.close();
    console.log('Done.');
}
crawl();
