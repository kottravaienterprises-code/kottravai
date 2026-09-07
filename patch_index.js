const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

const targetStr = `        const server = app.listen(port, async () => {
            console.log(\`✅ Server running on port \${port}\`);`;

const replacement = `        const server = app.listen(port, async () => {
            console.log(\`✅ Server running on port \${port}\`);
            
            if ((process.env.ANALYTICS_MODE || 'legacy') === 'postgres') {
                console.log('\\n==================================================');
                console.log('Analytics Configuration');
                console.log('==================================================');
                console.log('ANALYTICS_MODE=postgres');
                console.log('Analytics source: PostgreSQL');
                console.log('Analytics table: analytics_events');
                console.log('Raw Events Google Sheets ingestion: DISABLED');
                console.log('Google Sheets dashboard output: ENABLED');
                console.log('==================================================\\n');
            }`;

c = c.replace(targetStr, replacement);
fs.writeFileSync('server/index.js', c);
