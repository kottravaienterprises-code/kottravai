const fs = require('fs');

const extractAndWriteJSON = () => {
    // 1. Extract Categories
    const productsContent = fs.readFileSync('src/data/products.ts', 'utf8');
    const catMatch = productsContent.match(/export const categories = \[([\s\S]*?)\];/);
    
    // Evaluate the code securely to get JSON
    // We can evaluate it by wrapping it in a module
    const catScript = `module.exports = [${catMatch[1]}];`;
    fs.writeFileSync('temp_categories.js', catScript);
    const categories = require('./temp_categories.js');
    fs.writeFileSync('src/data/categories.json', JSON.stringify(categories, null, 2));

    // 2. Extract Artisans
    const artisanContent = fs.readFileSync('src/data/artisanData.ts', 'utf8');
    const artisanMatch = artisanContent.match(/export const ALL_ARTISANS: Artisan\[\] = (\[[\s\S]*?\]);/);
    const artisanScript = `module.exports = ${artisanMatch[1]};`;
    fs.writeFileSync('temp_artisans.js', artisanScript);
    const artisans = require('./temp_artisans.js');
    fs.writeFileSync('src/data/artisans.json', JSON.stringify(artisans, null, 2));

    fs.unlinkSync('temp_categories.js');
    fs.unlinkSync('temp_artisans.js');
    
    console.log("Successfully created categories.json and artisans.json");
};

extractAndWriteJSON();
