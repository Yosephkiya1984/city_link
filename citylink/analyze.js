const fs = require('fs');
const text = fs.readFileSync('ts_errors_utf8.txt', 'utf8');
const lines = text.split('\n');

const missing = {}; // format: functionName: [files]
for (const line of lines) {
  const m = line.match(/^([a-zA-Z0-9_\-\.\/\\]+)\(\d+,\d+\): error TS2614: Module '"([^"]+)"' has no exported member '([^']+)'/);
  if (m) {
     const file = m[1].replace(/\\/g, '/');
     const module = m[2];
     const func = m[3];
     const key = `${module} => ${func}`;
     if (!missing[key]) missing[key] = new Set();
     missing[key].add(file.split('/').pop());
  }
}

for (const [key, files] of Object.entries(missing)) {
  console.log(`${key} (in ${Array.from(files).join(', ')})`);
}
