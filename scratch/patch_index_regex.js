const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const replacement = `const isValidRoute = async (rawPath) => {
    // Robustly normalize Vercel and directory routes
    let reqPath = rawPath;
    
    // Remove trailing /index.html or /index
    if (reqPath.endsWith('/index.html')) {
        reqPath = reqPath.slice(0, -11);
    } else if (reqPath.endsWith('/index')) {
        reqPath = reqPath.slice(0, -6);
    }
    
    // Remove trailing slash if it's not exactly '/'
    if (reqPath.endsWith('/') && reqPath.length > 1) {
        reqPath = reqPath.slice(0, -1);
    }`;

code = code.replace(
    'const isValidRoute = async (rawPath) => {\n    const reqPath = (rawPath.endsWith("/") && rawPath.length > 1) ? rawPath.slice(0, -1) : rawPath;',
    replacement
);

fs.writeFileSync('server/index.js', code);
