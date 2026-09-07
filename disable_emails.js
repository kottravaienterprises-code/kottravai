const fs = require('fs');
const path = 'server/.env';
let env = fs.readFileSync(path, 'utf8');
env = env.replace('DAILY_ANALYTICS_ENABLED=true', 'DAILY_ANALYTICS_ENABLED=false');
fs.writeFileSync(path, env);
console.log('Disabled daily analytics in .env');
