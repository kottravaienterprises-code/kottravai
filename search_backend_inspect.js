const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'server', '.env') });
const db = require('./server/db');

const hasColumn = async (name) => {
  const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name=$1", [name]);
  return res.rows.length > 0;
};

const buildQuery = async (searchTerm) => {
  const hasSku = await hasColumn('sku');
  const hasTags = await hasColumn('tags');
  const phraseTerm = `%${searchTerm}%`;
  const startsWithTerm = `${searchTerm}%`;
  const exactTerm = searchTerm;

  const searchableText = `COALESCE(name, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(sku, '')${hasTags ? " || ' ' || COALESCE(array_to_string(tags, ' '), '')" : ''}`;

  const searchTokens = searchTerm
    .split(/\s+/)
    .map(t => t.trim())
    .filter(Boolean)
    .filter(t => t.toLowerCase() !== 'kottravai');

  const params = [];
  const tokenConditions = [];
  for (const token of searchTokens) {
    params.push(`%${token}%`);
    tokenConditions.push(`${searchableText} ILIKE $${params.length}`);
  }

  params.push(exactTerm); const exactNameIdx = params.length;
  params.push(startsWithTerm); const startsWithNameIdx = params.length;
  params.push(phraseTerm); const containsNameIdx = params.length;
  let skuContainsIdx = null;
  if (hasSku) { params.push(phraseTerm); skuContainsIdx = params.length; }
  let tagsContainsIdx = null;
  if (hasTags) { params.push(phraseTerm); tagsContainsIdx = params.length; }
  params.push(phraseTerm); const categoryContainsIdx = params.length;
  params.push(phraseTerm); const descriptionContainsIdx = params.length;

  const queryText = `SELECT *, (
    CASE
      WHEN name ILIKE $${exactNameIdx} THEN 100
      WHEN name ILIKE $${startsWithNameIdx} THEN 80
      WHEN name ILIKE $${containsNameIdx} THEN 60
      ELSE 0
    END +
    ${hasSku ? `CASE WHEN COALESCE(sku, '') ILIKE $${skuContainsIdx} THEN 40 ELSE 0 END +` : ''}
    ${hasTags ? `CASE WHEN COALESCE(array_to_string(tags, ' '), '') ILIKE $${tagsContainsIdx} THEN 30 ELSE 0 END +` : ''}
    CASE WHEN category ILIKE $${categoryContainsIdx} THEN 20 ELSE 0 END +
    CASE WHEN description ILIKE $${descriptionContainsIdx} THEN 10 ELSE 0 END +
    CASE WHEN ${tokenConditions.length > 0 ? tokenConditions.join(' AND ') : 'FALSE'} THEN 5 ELSE 0 END
  ) as relevance
  FROM products
  WHERE (${['name ILIKE $' + exactNameIdx, 'name ILIKE $' + startsWithNameIdx, 'name ILIKE $' + containsNameIdx]
    .concat(hasSku ? [`COALESCE(sku, '') ILIKE $${skuContainsIdx}`] : [])
    .concat(hasTags ? [`COALESCE(array_to_string(tags, ' '), '') ILIKE $${tagsContainsIdx}`] : [])
    .concat([`category ILIKE $${categoryContainsIdx}`, `description ILIKE $${descriptionContainsIdx}`])
    .concat(tokenConditions.length ? [`(${tokenConditions.join(' AND ')})`] : [])
    .join(' OR ')})
  AND is_live = TRUE
  ORDER BY relevance DESC, created_at DESC
  LIMIT 100`;

  return { queryText, params, hasSku, hasTags };
};

const inspect = async (query) => {
  const { queryText, params, hasSku, hasTags } = await buildQuery(query);
  console.log('=== SEARCH:', query);
  console.log('SQL:', queryText);
  console.log('PARAMS:', params);
  const res = await db.query(queryText, params);
  console.log('ROWS:', res.rows.length);
  for (let i = 0; i < res.rows.length; i += 1) {
    const p = res.rows[i];
    console.log(`\n${i + 1}. id=${p.id} name=${p.name || p.product_name || p.title}`);
    console.log(' category=', p.category);
    console.log(' sku=', p.sku);
    console.log(' tags=', JSON.stringify(p.tags));
    console.log(' description=', (p.description || p.short_description || '').slice(0,200));
  }
};

(async () => {
  for (const q of ['soap', 'necklace', 'coffee', 'kottravai heal soap']) {
    await inspect(q);
    console.log('\n-----------------------------\n');
  }
  process.exit(0);
})();
