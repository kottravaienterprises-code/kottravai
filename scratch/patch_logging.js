const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const logCode = `
    const diagnosticData = {
        url: req.url,
        path: req.path,
        originalUrl: req.originalUrl,
        query: req.query
    };
    res.setHeader('x-diagnostic-url', req.url || 'null');
    res.setHeader('x-diagnostic-path', req.path || 'null');
    res.setHeader('x-diagnostic-orig', req.originalUrl || 'null');
`;

code = code.replace(
    '// Check if it\'s a valid React route\n    const isValid = await isValidRoute(req.path);',
    logCode + '\n    // Check if it\'s a valid React route\n    const isValid = await isValidRoute(req.path);'
);

fs.writeFileSync('server/index.js', code);
