const { Client } = require('pg');
require('dotenv').config({ path: './server/.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function updateDb() {
  await client.connect();
  
  await client.query("UPDATE public.products SET category_slug = 'coconut-shell-products', category = 'Coconut Shell Products' WHERE category_slug = 'coco-crafts'");
  await client.query("UPDATE public.products SET category_slug = 'handmade-jewellery', category = 'Handmade Jewellery' WHERE category_slug = 'terracotta-ornaments'");
  await client.query("UPDATE public.products SET category_slug = 'banana-fiber-products', category = 'Banana Fiber Products' WHERE category_slug = 'banana-fibre-essentials'");
  await client.query("UPDATE public.products SET category_slug = 'idli-podi', category = 'Idli Podi' WHERE category_slug = 'daily-idly-mix'");

  // Update newly requested slugs as well:
  // "dosa batter mix", "ready to mix", "masala-powders"
  // Assuming they are dosa-batter-mix, ready-to-mix, masala-powders in display vs slug mapping
  
  const res = await client.query('SELECT DISTINCT category_slug, category FROM public.products');
  console.log('Categories in DB:', res.rows);

  await client.end();
}
updateDb().catch(console.error);
