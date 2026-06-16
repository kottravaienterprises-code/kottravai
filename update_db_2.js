const { Client } = require('pg');
require('dotenv').config({ path: './server/.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function updateDb() {
  await client.connect();
  
  await client.query("UPDATE public.products SET category_slug = 'dosa-batter-mix', category = 'Dosa Batter Mix' WHERE category_slug = 'tasty-dosa-mix'");
  await client.query("UPDATE public.products SET category_slug = 'ready-to-mix', category = 'Ready To Mix' WHERE category_slug = 'wholesome-rice-mix'");
  
  // Just in case masala-powders wasn't set cleanly (though it seemed it was):
  await client.query("UPDATE public.products SET category_slug = 'masala-powders', category = 'Masala Powders' WHERE category_slug = 'masala-powders'");

  const res = await client.query('SELECT DISTINCT category_slug, category FROM public.products');
  console.log('Categories in DB:', res.rows);

  await client.end();
}
updateDb().catch(console.error);
