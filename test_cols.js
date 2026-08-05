const { Pool } = require('pg'); 
require('dotenv').config(); 
const db = new Pool({ connectionString: process.env.DATABASE_URL }); 
db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public'").then(res => console.log(res.rows.map(r => r.column_name))).catch(console.error).finally(() => db.end());
