const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const historyPath = 'C:\\Users\\santh\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\History';
const copyPath = 'C:\\Users\\santh\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\History_copy';

// Copy the file because Chrome might lock it
try {
  fs.copyFileSync(historyPath, copyPath);
  console.log("Copied History database.");
} catch(e) {
  console.error("Copy failed:", e.message);
  process.exit(1);
}

const db = new sqlite3.Database(copyPath, (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.each(`SELECT url, title FROM urls WHERE title LIKE '%Kottravai_metrics_part2_PROD%' OR url LIKE '%docs.google.com/spreadsheets%' ORDER BY last_visit_time DESC LIMIT 20`, (err, row) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log(row.title, "->", row.url);
    }
  });
});

db.close();
