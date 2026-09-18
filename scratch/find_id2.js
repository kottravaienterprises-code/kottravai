const fs = require('fs');

function search() {
  try {
    const data = fs.readFileSync('C:\\Users\\santh\\.gemini\\antigravity\\brain\\b6dbb40a-74f4-4089-bc2a-efa11347b576\\.system_generated\\logs\\transcript.jsonl', 'utf8');
    const regex = /1[a-zA-Z0-9-_]{42,43}/g;
    const matches = [...new Set(data.match(regex))];
    console.log("Spreadsheet IDs found in prev:", matches);
  } catch(e) {
    console.log("Error:", e.message);
  }
}
search();
