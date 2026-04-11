const fs = require('fs');
const { execSync } = require('child_process');

const output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8', maxBuffer: 5*1024*1024 }).toString();
const lines = output.split('\n');

const fileCounts = {};
const errorCodes = {};

for (const line of lines) {
  const m = line.match(/^([^\(]+)\(\d+,\d+\): error (TS\d+)/);
  if (m) {
    const file = m[1].replace(/\\/g, '/');
    const code = m[2];
    fileCounts[file] = (fileCounts[file] || 0) + 1;
    errorCodes[code] = (errorCodes[code] || 0) + 1;
  }
}

console.log('=== TOP 20 FILES ===');
Object.entries(fileCounts).sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([f,c]) => console.log(`${c} : ${f}`));

console.log('\n=== ERROR CODES ===');
Object.entries(errorCodes).sort((a,b)=>b[1]-a[1]).forEach(([c,n]) => console.log(`${n} : ${c}`));
