const fs = require('fs');
let c = fs.readFileSync('server/services/googleSheetsService.js', 'utf8');
c = c.split("const db = require('../db');").join("");
c = "const db = require('../db');\n" + c; // Add it once at the top
fs.writeFileSync('server/services/googleSheetsService.js', c);
