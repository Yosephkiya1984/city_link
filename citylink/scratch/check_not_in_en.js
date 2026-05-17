const fs = require('fs');

const missingKeys = fs.readFileSync('c:/Users/yoseph/Desktop/city1/citylink/missing_am_keys.txt', 'utf8')
  .split('\n')
  .map(k => k.trim())
  .filter(k => k.length > 0);

const en = JSON.parse(fs.readFileSync('c:/Users/yoseph/Desktop/city1/citylink/src/locales/en.json', 'utf8'));

const notInEn = missingKeys.filter(k => !en[k]);

console.log(JSON.stringify(notInEn, null, 2));
