const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

// Patch isValidRoute
code = code.replace(
    'const isValidRoute = async (rawPath) => {\n    const reqPath = (rawPath.endsWith("/") && rawPath.length > 1) ? rawPath.slice(0, -1) : rawPath;',
    `const isValidRoute = async (rawPath) => {
    // Robustly normalize Vercel and directory routes
    let reqPath = rawPath;
    if (reqPath.endsWith('/index.html')) {
        reqPath = reqPath.slice(0, -11);
    } else if (reqPath.endsWith('/index')) {
        reqPath = reqPath.slice(0, -6);
    }
    if (reqPath.endsWith('/') && reqPath.length > 1) {
        reqPath = reqPath.slice(0, -1);
    }`
);

// Patch the Express middleware
const oldMiddleware = `app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
    }

    // Check if it's a static file (has extension)
    const hasExtension = req.path.includes('.');
    if (hasExtension) {
        // Let express.static handle it if the file exists
        const filePath = req.path.startsWith('/') ? req.path.slice(1) : req.path;
        if (fileExists(filePath)) {
            return next();
        } else {
            const indexFilePath = path.join(distPath, 'index.html');
            await injectMetadata(indexFilePath, req.path, 404, res);
            return;
        }
    }

    // Check if it's a valid React route
    const isValid = await isValidRoute(req.path);
    const statusCode = isValid ? 200 : 404;

    const buildFolder = 'dist';
    const indexFilePath = path.join(__dirname, \`../\${buildFolder}/index.html\`);
    await injectMetadata(indexFilePath, req.path, statusCode, res);
});`;

const newMiddleware = `app.use(async (req, res, next) => {
    // Normalize Vercel directory index rewrites
    let reqPath = req.path;
    if (reqPath.endsWith('/index.html')) {
        reqPath = reqPath.slice(0, -11);
    } else if (reqPath.endsWith('/index')) {
        reqPath = reqPath.slice(0, -6);
    }
    // Note: We don't strip trailing slashes here yet, isValidRoute handles that.

    if (reqPath.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
    }

    // Check if it's a static file (has extension)
    const hasExtension = reqPath.includes('.');
    if (hasExtension) {
        // Let express.static handle it if the file exists
        const filePath = reqPath.startsWith('/') ? reqPath.slice(1) : reqPath;
        if (fileExists(filePath)) {
            return next();
        } else {
            const indexFilePath = path.join(distPath, 'index.html');
            await injectMetadata(indexFilePath, reqPath, 404, res);
            return;
        }
    }

    // Check if it's a valid React route
    const isValid = await isValidRoute(reqPath);
    const statusCode = isValid ? 200 : 404;

    const buildFolder = 'dist';
    const indexFilePath = path.join(__dirname, \`../\${buildFolder}/index.html\`);
    await injectMetadata(indexFilePath, reqPath, statusCode, res);
});`;

code = code.replace(oldMiddleware, newMiddleware);

fs.writeFileSync('server/index.js', code);
console.log("Patched!");
