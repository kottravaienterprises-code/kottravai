const db = require('./db');

async function run() {
  try {
    const res = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(res.rows);
    process.exit(0);
  } catch(e) {
    console.log(e);
    process.exit(1);
  }
}
run();
