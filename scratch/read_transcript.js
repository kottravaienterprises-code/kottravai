const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\santh\\.gemini\\antigravity\\brain\\5c60b879-9d93-4c8f-82d8-2868ab6970e3\\.system_generated\\logs\\transcript.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('USER_INPUT')) {
      const data = JSON.parse(line);
      if (data.type === 'USER_INPUT') {
          console.log("=== USER INPUT STEP", data.step_index, "===");
          console.log(data.content.slice(0, 1000));
          console.log("...");
      }
    }
  }
}

processLineByLine();
