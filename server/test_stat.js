const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres:Kottravai%40123@db.itqdnbwbbhyaapquxlqs.supabase.co:5432/postgres', ssl: { rejectUnauthorized: false }, family: 4 }); 
client.connect().then(async () => { 
    console.log('Connected direct to backend!'); 
    const res = await client.query('SELECT count(*) FROM pg_stat_activity'); 
    console.log('Active connections:', res.rows[0].count); 
    const res2 = await client.query('SELECT pid, state, wait_event_type, left(query, 100) as query FROM pg_stat_activity WHERE state != \'idle\''); 
    console.log('Queries:', res2.rows); 
    client.end(); 
}).catch(e => console.error(e));
