const https = require('https');
const urlsToTest = [
    { url: 'https://www.kottravai.in/', expected: 200 },
    { url: 'https://www.kottravai.in/shop', expected: 200 },
    { url: 'https://www.kottravai.in/about', expected: 200 },
    { url: 'https://www.kottravai.in/contact', expected: 200 },
    { url: 'https://www.kottravai.in/b2b', expected: 301 },
    { url: 'https://www.kottravai.in/b2b/', expected: 200 },
    { url: 'https://www.kottravai.in/blog', expected: 301 },
    { url: 'https://www.kottravai.in/blog/', expected: 200 },
    { url: 'https://www.kottravai.in/category/coconut-shell-products', expected: 200 },
    { url: 'https://www.kottravai.in/category/handicrafts', expected: 200 },
    { url: 'https://www.kottravai.in/product/the-quote-stand--coconut-shell', expected: 200 },
    { url: 'https://www.kottravai.in/product/onam-celebration-kathakali-necklace', expected: 200 },
    { url: 'https://www.kottravai.in/this-url-does-not-exist-404', expected: 404 },
    { url: 'https://www.kottravai.in/category/this-category-does-not-exist', expected: 404 },
    { url: 'https://www.kottravai.in/product/this-product-does-not-exist', expected: 404 },
    { url: 'https://www.kottravai.in/blog/this-blog-does-not-exist', expected: 404 },
    { url: 'https://www.kottravai.in/api/products', expected: 200 },
    { url: 'https://www.kottravai.in/robots.txt', expected: 200 },
    { url: 'https://www.kottravai.in/sitemap.xml', expected: 200 }
];

const testUrl = (item) => {
    return new Promise((resolve) => {
        https.get(item.url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let canonical = 'N/A';
                let title = 'N/A';
                let desc = 'N/A';
                let h1 = 'N/A';
                let jsonld = 'N/A';
                
                const titleMatch = data.match(/<title[^>]*>(.*?)<\/title>/i);
                if (titleMatch) title = titleMatch[1];
                
                const descMatch = data.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i);
                if (descMatch) desc = descMatch[1];
                
                const canonMatch = data.match(/<link[^>]*rel=["']canonical["'][^>]*href=["'](.*?)["']/i);
                if (canonMatch) canonical = canonMatch[1];
                
                const h1Match = data.match(/<h1[^>]*>(.*?)<\/h1>/i);
                if (h1Match) h1 = h1Match[1];
                
                const jsonldMatch = data.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
                if (jsonldMatch) jsonld = 'Present';

                let finalUrl = item.url;
                if (res.statusCode === 301 || res.statusCode === 308) {
                    finalUrl = res.headers.location;
                }

                resolve({
                    url: item.url.replace('https://www.kottravai.in', ''),
                    expected: item.expected,
                    actual: res.statusCode,
                    finalUrl: finalUrl.replace('https://www.kottravai.in', ''),
                    canonical,
                    title,
                    desc,
                    h1,
                    jsonld
                });
            });
        }).on('error', (e) => resolve({
            url: item.url, error: e.message
        }));
    });
};

const run = async () => {
    const results = [];
    for (const item of urlsToTest) {
        results.push(await testUrl(item));
    }
    console.log(JSON.stringify(results, null, 2));
};
run();
