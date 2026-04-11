const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.match(/[áð]/)) {
     // Encode back to windows-1252 bytes
     const bytes = iconv.encode(content, 'windows-1252');
     
     // See if it decodes cleanly to utf8
     const restored = iconv.decode(bytes, 'utf8');
     
     // Do a sanity check on restored content
     if (restored.includes('')) {
         console.log('Skipping due to invalid UTF-8 (might not be purely mojibaked):', filePath);
         return;
     }
     
     fs.writeFileSync(filePath, restored, 'utf8');
     console.log('Fixed:', filePath);
  }
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

traverseDir(path.join(__dirname, 'src', 'screens'));
