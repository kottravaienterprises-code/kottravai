const db = require('./db');
async function checkIndexes() {
  try {
    const res = await db.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'products';
    `);
    console.table(res.rows);
  } catch(e) {
    console.error(e);
  }
}
checkIndexes();
