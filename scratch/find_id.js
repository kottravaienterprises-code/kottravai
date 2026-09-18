const fs = require('fs');

function search() {
  const data = fs.readFileSync('C:\\Users\\santh\\.gemini\\antigravity\\brain\\5c60b879-9d93-4c8f-82d8-2868ab6970e3\\.system_generated\\logs\\transcript.jsonl', 'utf8');
  const regex = /1[a-zA-Z0-9-_]{42,43}/g;
  const matches = [...new Set(data.match(regex))];
  console.log("Spreadsheet IDs found:", matches);
}
search();
