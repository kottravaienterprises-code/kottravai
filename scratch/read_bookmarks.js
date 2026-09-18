const fs = require('fs');
const path = 'C:\\Users\\santh\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Bookmarks';

try {
  const data = fs.readFileSync(path, 'utf8');
  const json = JSON.parse(data);

  function search(node) {
    if (node.name && node.name.includes('Kottravai_metrics_part2_PROD')) {
      console.log("FOUND:", node.name, "->", node.url);
    }
    if (node.url && node.url.includes('docs.google.com/spreadsheets')) {
      if (node.name.includes('Kottravai')) {
         console.log("FOUND SHEET:", node.name, "->", node.url);
      }
    }
    if (node.children) {
      node.children.forEach(search);
    }
  }

  if (json.roots) {
    Object.values(json.roots).forEach(search);
  }
} catch (e) {
  console.log("Error reading Bookmarks:", e.message);
}
