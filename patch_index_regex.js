const fs = require('fs');

const idxPath = 'server/index.js';
let content = fs.readFileSync(idxPath, 'utf8');

// Replace the queryText definition inside GET /api/products
const regex = /let queryText = q\s*\?\s*`SELECT \*, ts_rank\(search_vector, websearch_to_tsquery\('english', \$1\)\) AS relevance FROM products`\s*:\s*'SELECT \* FROM products';[\s\S]*?if\s*\(q\)\s*\{\s*queryText \+= ' ORDER BY relevance DESC, created_at DESC';\s*\}\s*else\s*\{\s*queryText \+= ' ORDER BY created_at DESC';\s*\}/g;

const replaceStr = `        let queryText = q 
            ? \`SELECT p.*, ts_rank(p.search_vector, websearch_to_tsquery('english', $1)) AS relevance\`
            : 'SELECT p.*';
            
        let joinClause = '';
        if (req.query.sort === 'best-selling') {
            queryText += \`, COALESCE(sales_aggregation.sales_count, 0) AS "salesCount", COALESCE(sales_aggregation.revenue, 0) AS "salesRevenue"\`;
            joinClause = \` LEFT JOIN (
                SELECT 
                    (item->>'id')::uuid AS product_id, 
                    SUM((item->>'quantity')::integer) AS sales_count,
                    SUM((item->>'price')::numeric * (item->>'quantity')::numeric) AS revenue
                FROM orders, jsonb_array_elements(items) AS item
                WHERE status IN ('Processing', 'Delivered')
                GROUP BY (item->>'id')::uuid
            ) sales_aggregation ON p.id = sales_aggregation.product_id\`;
        }
        
        queryText += ' FROM products p';
        if (joinClause) queryText += joinClause;
        
        let conditions = [];
        let params = [];

        if (q) {
            params.push(q);
            conditions.push("p.search_vector @@ websearch_to_tsquery('english', $1)");
        }

        if (!isAdmin) {
            conditions.push('p.is_live = TRUE');
        }

        if (category_slug) {
            params.push(category_slug);
            conditions.push(\`p.category_slug = $\${params.length}\`);
        }

        if (is_best_seller === 'true') {
            conditions.push('p.is_best_seller = TRUE');
        }

        if (hub) {
            params.push(hub);
            conditions.push(\`p.hub = $\${params.length}\`);
        }

        if (conditions.length > 0) {
            queryText += ' WHERE ' + conditions.join(' AND ');
        }

        if (q) {
            queryText += ' ORDER BY relevance DESC, p.created_at DESC';
        } else if (req.query.sort === 'best-selling') {
            queryText += ' ORDER BY "salesCount" DESC, "salesRevenue" DESC, p.created_at DESC';
        } else {
            queryText += ' ORDER BY p.created_at DESC';
        }`;

if (regex.test(content)) {
    content = content.replace(regex, replaceStr);
    fs.writeFileSync(idxPath, content);
    console.log("Successfully patched server/index.js");
} else {
    console.log("Target regex not found in server/index.js");
}
