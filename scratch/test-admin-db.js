require('dotenv').config({ path: require('path').resolve(__dirname, '../server/.env') });
const db = require('../server/db');

(async () => {
    try {
        console.log('Testing DB connection...');
        const res = await db.query('SELECT NOW()');
        console.log('Success!', res.rows);
    } catch (err) {
        console.error('DB Error:', err);
    } finally {
        process.exit();
    }
})();
