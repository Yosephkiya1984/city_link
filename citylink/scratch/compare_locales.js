const fs = require('fs');

const en = JSON.parse(fs.readFileSync('c:/Users/yoseph/Desktop/city1/citylink/src/locales/en.json', 'utf8'));
const am = JSON.parse(fs.readFileSync('c:/Users/yoseph/Desktop/city1/citylink/src/locales/am.json', 'utf8'));

const missingInAm = Object.keys(en).filter(k => !am[k]);

console.log(JSON.stringify(missingInAm, null, 2));
