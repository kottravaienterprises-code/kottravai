require('dotenv').config({path:'./server/.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'").then(res => {
    console.table(res.rows);
    pool.end();
}).catch(e => console.error(e));
