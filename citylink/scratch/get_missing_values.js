const fs = require('fs');

const en = JSON.parse(fs.readFileSync('c:/Users/yoseph/Desktop/city1/citylink/src/locales/en.json', 'utf8'));
const am = JSON.parse(fs.readFileSync('c:/Users/yoseph/Desktop/city1/citylink/src/locales/am.json', 'utf8'));

const missingInAm = Object.keys(en).filter(k => !am[k]);

const missingWithEn = {};
missingInAm.forEach(k => {
  missingWithEn[k] = en[k];
});

console.log(JSON.stringify(missingWithEn, null, 2));
