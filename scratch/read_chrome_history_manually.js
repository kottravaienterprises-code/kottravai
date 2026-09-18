const fs = require('fs');

try {
  const historyData = fs.readFileSync('C:\\Users\\santh\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\History_copy', 'binary');
  const regex = /https:\/\/docs\.google\.com\/spreadsheets\/d\/1[a-zA-Z0-9-_]{42,43}/g;
  const matches = [...new Set(historyData.match(regex))];
  console.log("Found in History:", matches);
} catch (e) {
  console.error(e.message);
}
