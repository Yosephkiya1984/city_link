const fs = require('fs');
const path = require('path');

const errorsText = fs.readFileSync('ts_errors_utf8.txt', 'utf8');
const missingMap = {}; // func => set of files needing it

for (const line of errorsText.split('\n')) {
  const m = line.match(/^([a-zA-Z0-9_\-\.\/\\]+)\(\d+,\d+\): error TS2614: Module '"([^"]+)"' has no exported member '([^']+)'/);
  if (m) {
     const file = m[1].replace(/\\/g, '/');
     const func = m[3];
     if (!missingMap[func]) missingMap[func] = new Set();
     missingMap[func].add(file.split('/').pop());
  }
}

// Search all services for these exports
const servicesDir = path.join(__dirname, 'src', 'services');
const serviceFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.ts'));

console.log("=== IMPORT FIX MAPPING ===");
for (const func of Object.keys(missingMap)) {
  let foundIn = null;
  for (const sf of serviceFiles) {
    const code = fs.readFileSync(path.join(servicesDir, sf), 'utf8');
    // Look for export const funcName or export async function funcName
    if (code.includes(`export const ${func}`) || code.includes(`export async function ${func}`) || code.includes(`export function ${func}`)) {
       foundIn = sf;
       break;
    }
  }
  
  if (foundIn) {
     const servicePath = foundIn.replace('.ts', '');
     console.log(`Function: ${func} -> moved to: ${servicePath}`);
     console.log(`Affected screens: ${Array.from(missingMap[func]).join(', ')}\n`);
  } else {
     console.log(`Function: ${func} -> NOT FOUND IN ANY SERVICE!`);
     console.log(`Affected screens: ${Array.from(missingMap[func]).join(', ')}\n`);
  }
}
