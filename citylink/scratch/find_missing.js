const fs = require('fs');

const missingKeys = fs.readFileSync('c:/Users/yoseph/Desktop/city1/citylink/missing_am_keys.txt', 'utf8')
  .split('\n')
  .map(k => k.trim())
  .filter(k => k.length > 0);

const amJson = JSON.parse(fs.readFileSync('c:/Users/yoseph/Desktop/city1/citylink/src/locales/am.json', 'utf8'));

const reallyMissing = missingKeys.filter(k => !amJson[k]);

console.log(JSON.stringify(reallyMissing, null, 2));
