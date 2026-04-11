const fs = require('fs');
const text = fs.readFileSync('ts_errors_3.txt', 'utf16le');
const lines = text.split('\n');

let missingCount = 0;
for (const line of lines) {
  if (line.includes('has no exported member')) {
    missingCount++;
    console.log(line.trim());
  }
}
console.log(`\nRemaining broken imports: ${missingCount}`);
