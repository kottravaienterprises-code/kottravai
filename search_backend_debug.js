const axios = require('axios');

const queries = ['soap', 'necklace', 'coffee', 'kottravai heal soap'];

const normalize = (v) => (v ? String(v).toLowerCase() : '');

const fieldMatch = (product, q) => {
  const qlc = q.toLowerCase();
  const terms = qlc.split(/\s+/).filter(Boolean);
  const name = normalize(product.name || product.product_name || product.title);
  const cat = normalize(product.category);
  const desc = normalize(product.description || product.short_description);
  const sku = normalize(product.sku);
  const tags = Array.isArray(product.tags)
    ? product.tags.map((t) => normalize(t)).join(' ')
    : normalize(product.tags);

  if (name === qlc) return 'Exact Name';
  if (name.startsWith(qlc)) return 'Starts With Name';
  if (name.includes(qlc)) return 'Contains Name';
  if (sku && sku.includes(qlc)) return 'SKU';
  if (tags && tags.includes(qlc)) return 'Tags';
  if (cat.includes(qlc)) return 'Category';
  if (desc.includes(qlc)) return 'Description';
  if (terms.length > 1) {
    if (terms.every((t) => name.includes(t))) return 'Name Tokens';
    if (terms.every((t) => sku.includes(t))) return 'SKU Tokens';
    if (terms.every((t) => tags.includes(t))) return 'Tags Tokens';
    if (terms.every((t) => cat.includes(t))) return 'Category Tokens';
    if (terms.every((t) => desc.includes(t))) return 'Description Tokens';
  }
  for (const t of terms) {
    if (name.includes(t)) return 'Name Token';
    if (sku.includes(t)) return 'SKU Token';
    if (tags.includes(t)) return 'Tags Token';
    if (cat.includes(t)) return 'Category Token';
    if (desc.includes(t)) return 'Description Token';
  }
  return 'No Match';
};

(async () => {
  for (const q of queries) {
    const url = `http://localhost:5000/api/products?q=${encodeURIComponent(q)}&limit=100`;
    try {
      const res = await axios.get(url);
      console.log('QUERY:', q);
      console.log('URL:', url);
      console.log('ROWS:', res.data.length);
      res.data.forEach((p, i) => {
        const match = fieldMatch(p, q);
        const name = p.name || p.product_name || p.title || '<unnamed>';
        console.log(`${i + 1}. ${name} — ${match}`);
      });
      console.log('---');
    } catch (err) {
      console.error('ERROR', q, err.message);
    }
  }
})();
