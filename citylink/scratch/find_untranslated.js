const fs = require('fs');

const am = JSON.parse(fs.readFileSync('c:/Users/yoseph/Desktop/city1/citylink/src/locales/am.json', 'utf8'));

const untranslated = Object.entries(am).filter(([k, v]) => !v || v === k);

console.log(JSON.stringify(untranslated, null, 2));
