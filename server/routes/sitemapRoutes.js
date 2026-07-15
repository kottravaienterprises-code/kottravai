const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('../db'); // Your Supabase Postgres pool
const blogPostsData = require(path.resolve(__dirname, '../../src/data/posts.json'));

const HOSTNAME = 'https://www.kottravai.in';

const escapeXML = (str) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
};

const toUrlSlug = (value) => {
    if (!value) return '';
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

const formatDate = (value) => {
    if (!value) return new Date().toISOString();
    return new Date(value).toISOString();
};

// 1. Parent Sitemap Index
router.get(['/sitemap.xml', '/sitemap-index.xml'], (req, res) => {
    res.header('Content-Type', 'application/xml');
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${HOSTNAME}/sitemap-products.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${HOSTNAME}/sitemap-pages.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${HOSTNAME}/sitemap-categories.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${HOSTNAME}/sitemap-blog.xml</loc>
  </sitemap>
</sitemapindex>`;
    res.send(xml);
});

// 2. Products Sitemap
router.get('/sitemap-products.xml', async (req, res) => {
    res.header('Content-Type', 'application/xml');
    
    try {
        const result = await db.query('SELECT slug, name, created_at FROM products WHERE is_live = true');
        
        let urlset = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        
        result.rows.forEach(product => {
            const loc = `${HOSTNAME}/product/${product.slug}`;
            const lastMod = formatDate(product.created_at);
            
            urlset += `  <url>
    <loc>${escapeXML(loc)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
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

router.get('/sitemap_products_1.xml', (req, res) => {
    res.redirect(301, '/sitemap-products.xml');
});

// 3. Pages Sitemap
router.get('/sitemap-pages.xml', (req, res) => {
    res.header('Content-Type', 'application/xml');
    
    const staticPages = [
        '',
        '/shop',
        '/about',
        '/contact',
        '/b2b',
        '/faqs',
        '/alliance',
        '/services',
        '/camps',
        '/advertise',
        '/gift-cards',
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

router.get('/sitemap_pages_1.xml', (req, res) => {
    res.redirect(301, '/sitemap-pages.xml');
});

router.get('/sitemap_index.xml', (req, res) => {
    res.redirect(301, '/sitemap.xml');
});

// 4. Categories Sitemap
router.get('/sitemap-categories.xml', async (req, res) => {
    res.header('Content-Type', 'application/xml');
    
    try {
        const result = await db.query('SELECT DISTINCT category FROM products WHERE is_live = true');
        
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
            const slug = toUrlSlug(row.category);
            if (!slug) return;
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
        console.error('Error generating categories sitemap:', error.message);
        res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
    }
});

router.get('/sitemap_collections_1.xml', (req, res) => {
    res.redirect(301, '/sitemap-categories.xml');
});

// 5. Blogs Sitemap
router.get('/sitemap-blog.xml', async (req, res) => {
    res.header('Content-Type', 'application/xml');
    
    try {
        const now = new Date().toISOString();
        let urlset = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        
        urlset += `  <url>
    <loc>${HOSTNAME}/blog</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
  </url>\n`;

        let entriesAdded = 0;
        try {
            const blogsResult = await db.query('SELECT slug, updated_at FROM blog_posts WHERE published = true');
            blogsResult.rows.forEach(blog => {
                const loc = `${HOSTNAME}/blog/${blog.slug}`;
                const lastMod = formatDate(blog.updated_at || now);
                urlset += `  <url>
    <loc>${escapeXML(loc)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
  </url>\n`;
                entriesAdded += 1;
            });
        } catch (e) {
            // blog_posts table might not exist or query failed; fall back to static post data.
        }

        if (entriesAdded === 0 && Array.isArray(blogPostsData)) {
            blogPostsData.forEach(post => {
                if (!post?.slug) return;
                const loc = `${HOSTNAME}/blog/${post.slug}`;
                const lastMod = formatDate(post.publishDate || now);
                urlset += `  <url>
    <loc>${escapeXML(loc)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
  </url>\n`;
            });
        }
        
        urlset += `</urlset>`;
        res.send(urlset);
    } catch (error) {
        console.error('Error generating blogs sitemap:', error.message);
        res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
    }
});

router.get('/sitemap_blogs_1.xml', (req, res) => {
    res.redirect(301, '/sitemap-blog.xml');
});

module.exports = router;
