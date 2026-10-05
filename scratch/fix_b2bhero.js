const fs = require('fs');
let code = fs.readFileSync('src/components/b2b/B2BHero.tsx', 'utf8');
code = code.replace(/import\s*\{\s*ArrowRight,\s*ChevronDown\s*\}\s*from\s*['"]lucide-react['"];/, 'import { ArrowRight } from "lucide-react";');
fs.writeFileSync('src/components/b2b/B2BHero.tsx', code);
console.log('Fixed B2BHero.tsx');
