const fs = require('fs');
const path = require('path');

const replacements = {
  // Emojis first
  'ðŸšŒ': '🚌',
  'ðŸ“¡': '📡',
  'ðŸ’ˆ': '💈',
  'ðŸ ½ï¸ ': '🍽️',
  'ðŸ…¿ï¸ ': '🅿️',
  'ðŸ› ï¸ ': '🛍️',
  'ðŸ‘¥': '👥',
  'ðŸ  ': '🏠',
  'ðŸ’¼': '💼',
  'ðŸ“ ': '📍',
  'ðŸ“Š': '📊',
  'ðŸ ¥': '🏥',
  'ðŸ ª': '🏬',
  'ðŸš•': '🚕',
  'ðŸ¤ ': '🤝',
  'ðŸ”§': '🔧',
  
  // Specific Amharic strings found in grep
  'áŠ áˆ›áˆ­áŠ›': 'አማርኛ',
  'á‹¨áŠ•áŒ á‹µ áˆµáˆ ': 'የንግድ ስም',
  'á‹¨áŠ•áŒ á‹µ á‰³áŠ­áˆ² á‰ áŒ¥áˆ­': 'የንግድ ታክስ ቁጥር',
  'á‹¨áˆ áŒ á‰¥ áŠ áˆ°áˆ«áˆ­ á ˆá‰ƒá‹µ': 'የምግብ አሰራር ፈቃድ',
  'áŠ­á  áˆˆ áŠ¨á‰°áˆ›': 'ክፍለ ከተማ',
  'á‹¨áŠ•áŒ á‹µ áŠ á‹µáˆ«áˆ»': 'የንግድ አድራሻ',
  'á‹¨áˆµáˆ« áˆ°á‹“á‰¶á‰½': 'የስራ ሰዓቶች',
  'á‹¨áŠ•áŒ á‹µ áŠ¢áˆœá‹­áˆ ': 'የንግድ ኢሜይል',
  'á‹¨áˆ°á‹  á‰¥á‹›á‰µ': 'የሰው ብዛት',
  'á‹¨áŠ•áŒ á‹¥ á ˆá‰ƒá‹µ á‰ áŒ¥áˆ­': 'የንግድ ፈቃድ ቁጥር',
  'á‹¨áˆ˜áŠ•áŒ áˆˆá‹« á‰¥á‹›á‰µ': 'የመኪና ማቆሚያ ብዛት',
  'á‹¨áŠ©á‰£áŠ•á‹« áˆµáˆ ': 'የኩባንያ ስም',
  'á‹¨áŠ©á‰£áŠ•á‹« áˆ á‹ áŒ á‰¥ á ˆá‰ƒá‹µ': 'የኩባንያ ንግድ ፈቃድ',
  'á‹¨áŠ©á‰£áŠ•á‹« áŠ á‹µáˆ«áˆ»': 'የኩባንያ አድራሻ',
  'á‹¨áŠ©á‰£áŠ•á‹« áŠ¢áˆœá‹­áˆ ': 'የኩባንያ ኢሜይል',
  'á‹¨áŠ¥á‹ á‰‚á‹« áˆ°á‹ ': 'የአድራሻ ሰው',
  'á‹¨áŠ¥á‹ á‰‚á‹« áˆµáˆ áŠ­': 'የአድራሻ ስልክ',
  'á‹¨áŠ áŒˆáˆ áŒ áˆŽá‰µ áŠ­áˆ áˆ ': 'የአገልግሎት ክልል',
  'á‹¨á‰µáˆ«áŠ•áˆµá –áˆ­á‰µ á ˆá‰ƒá‹µ': 'የትራንስፖርት ፈቃድ'
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  for (const [bad, good] of Object.entries(replacements)) {
    // Global replacement without regex special char issues
    content = content.split(bad).join(good);
  }
  
  if (content !== originalContent) {
     fs.writeFileSync(filePath, content, 'utf8');
     console.log('Restored text in:', filePath);
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
