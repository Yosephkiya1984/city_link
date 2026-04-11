const fs = require('fs');
const path = require('path');

const authScreenPath = path.join(__dirname, 'src', 'screens', 'core', 'AuthScreen.tsx');
let content = fs.readFileSync(authScreenPath, 'utf8');

// The regex matches: label=" + any broken string starting with á + " / " 
// and replaces it with just label=" so only the English remains!
// Example: label="á‹¨áŠ•áŒ á‹µ áˆµáˆ  / Business Name"  => label="Business Name"
let original = content;
content = content.replace(/label="á[^"]+ \/ /g, 'label="');

// Also catch placeholders
content = content.replace(/placeholder="á[^"]+ \/ /g, 'placeholder="');

// Also catch string literals just in case
content = content.replace(/'á[^']+ \/ /g, "'");
content = content.replace(/`á[^`]+ \/ /g, "`");

if (content !== original) {
  fs.writeFileSync(authScreenPath, content, 'utf8');
  console.log('Successfully scrubbed remaining mojibake from AuthScreen.tsx');
} else {
  console.log('No leftover mojibake found.');
}
