const express = require('express');
const router = express.Router();
const db = require('../db'); // Your Supabase Postgres pool
const { format } = require('date-fns');

const HOSTNAME = 'https://www.kottravai.in';

const escapeXML = (str) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
};

// 1. Parent Sitemap Index
router.get('/sitemap.xml', (req, res) => {
    res.header('Content-Type', 'application/xml');
    
    // Shopify style sitemap index
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${HOSTNAME}/sitemap_products_1.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${HOSTNAME}/sitemap_pages_1.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${HOSTNAME}/sitemap_collections_1.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${HOSTNAME}/sitemap_blogs_1.xml</loc>
  </sitemap>
</sitemapindex>`;
    res.send(xml);
});

// 2. Products Sitemap
router.get('/sitemap_products_1.xml', async (req, res) => {
    res.header('Content-Type', 'application/xml');
    
    try {
        const result = await db.query('SELECT slug, name, updated_at FROM products WHERE is_active = true');
        
        let urlset = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
        
        result.rows.forEach(product => {
            const loc = `${HOSTNAME}/product/${product.slug}`;
            const lastMod = product.updated_at ? new Date(product.updated_at).toISOString() : new Date().toISOString();
            
            // Note: Since actual image URLs aren't in the products table explicitly without fetching from storage,
            // we will provide the base product URL structure.
            urlset += `  <url>
    <loc>${escapeXML(loc)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <image:image>
      <image:loc>${HOSTNAME}/images/products/${escapeXML(product.slug)}.jpg</image:loc>
      <image:title>${escapeXML(product.name)}</image:title>
      <image:caption>${escapeXML(product.name)}</image:caption>
    </image:image>
  </url>\n`;
        });
        
        urlset += `</urlset>`;
        res.send(urlset);
    } catch (error) {
        console.error('Error generating product sitemap:', error.message);
        // Fallback to empty if DB is down
        res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
    }
});

// 3. Pages Sitemap
router.get('/sitemap_pages_1.xml', (req, res) => {
    res.header('Content-Type', 'application/xml');
    
    const staticPages = [
        '',
        '/about',
        '/contact',
        '/b2b',
        '/faqs',
        '/alliance',
        '/camps',
        '/shipping-policy',
        '/refund-policy',
        '/terms-of-service',
        '/privacy-policy'
    ];
    
    const now = new Date().toISOString();
    let urlset = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    staticPages.forEach(page => {
        urlset += `  <url>
    <loc>${HOSTNAME}${page}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
  </url>\n`;
    });
    
    urlset += `</urlset>`;
    res.send(urlset);
});

// 4. Collections Sitemap (Categories)
router.get('/sitemap_collections_1.xml', async (req, res) => {
    res.header('Content-Type', 'application/xml');
    
    try {
        const result = await db.query('SELECT DISTINCT category FROM products WHERE is_active = true');
        
        const now = new Date().toISOString();
        let urlset = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        
        // Add main shop page
        urlset += `  <url>
    <loc>${HOSTNAME}/shop</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
  </url>\n`;

        result.rows.forEach(row => {
            if (!row.category) return;
            const slug = row.category.toLowerCase().replace(/\\s+/g, '-');
            const loc = `${HOSTNAME}/category/${slug}`;
            
            urlset += `  <url>
    <loc>${escapeXML(loc)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
  </url>\n`;
        });
        
        urlset += `</urlset>`;
        res.send(urlset);
    } catch (error) {
        console.error('Error generating collections sitemap:', error.message);
        res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
    }
});

// 5. Blogs Sitemap
router.get('/sitemap_blogs_1.xml', async (req, res) => {
    res.header('Content-Type', 'application/xml');
    
    try {
        // Assuming there is a blogs table, or just static blog listing
        // If not, we just return the base blog index
        const now = new Date().toISOString();
        let urlset = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        
        urlset += `  <url>
    <loc>${HOSTNAME}/blog</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
  </url>\n`;

        // Attempt to fetch blogs if table exists
        try {
            const blogsResult = await db.query('SELECT slug, updated_at FROM blogs WHERE status = $1', ['Published']);
            blogsResult.rows.forEach(blog => {
                const loc = `${HOSTNAME}/blog/${blog.slug}`;
                const lastMod = blog.updated_at ? new Date(blog.updated_at).toISOString() : now;
                urlset += `  <url>
    <loc>${escapeXML(loc)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
  </url>\n`;
            });
        } catch (e) {
            // Blogs table might not exist, silently ignore and just return /blog
        }
        
        urlset += `</urlset>`;
        res.send(urlset);
    } catch (error) {
        console.error('Error generating blogs sitemap:', error.message);
        res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
    }
});

module.exports = router;
