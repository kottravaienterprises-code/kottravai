const { Pool } = require('pg');
require('dotenv').config();
const db = new Pool({ connectionString: process.env.DATABASE_URL });
db.query("SELECT column_name, character_maximum_length FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public'").then(res => console.log(res.rows)).catch(console.error).finally(() => db.end());
