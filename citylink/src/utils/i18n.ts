interface TranslationEntry {
  en?: string;
  am?: string;
  or?: string;
}

// Dictionary of English strings/keys to Amharic and Oromo
const translations: Record<string, TranslationEntry> = {
  // Navigation & Core Actions
  Home: { am: 'መነሻ', or: 'Mana' },
  Wallet: { am: 'ዋሌት', or: 'Galmee' },
  Profile: { am: 'ፕሮፋይል', or: 'Profaayila' },
  Notifications: { am: 'ማሳወቂያዎች', or: 'Beeksisa' },
  'Send Money': { am: 'ገንዘብ ላክ', or: 'Maallaqa Ergi' },
  'Pay Merchant': { am: 'ክፈል', or: 'Kaffali' },
  'Top Up': { am: 'ሙላ', or: 'Guuti' },
  History: { am: 'ታሪክ', or: 'Seenaa' },
  Language: { am: 'ቋንቋ', or: 'Afaan' },
  pay: { am: 'ክፈል', or: 'Kaffali' },
  send: { am: 'ላክ', or: 'Ergi' },
  wal_bal: { am: 'ዋሌት ቀሪ ሂሳብ', or: 'Hambaa galmee' },

  // Core 6 Modules
  Ekub: { am: 'እቁብ', or: 'Iquubii' },
  Marketplace: { am: 'ገበያ', or: 'Gabaa' },
  Delala: { am: 'ደላላ', or: 'Dallaala' },
  Food: { am: 'ምግብ', or: 'Nyaata' },
  Parking: { am: 'ፓርኪንግ', or: 'Paarkingii' },
  Delivery: { am: 'ደሊቨሪ', or: 'Geejjiba' },

  // Home Service Labels
  search_products: { en: 'Search products...', am: 'እቃዎችን ይፈልጉ...', or: "Madaala too'adhu..." },
  listings: { en: 'Listings', am: 'ርዝሮች', or: 'Ibsaa' },
  your_listings: { en: 'Your Listings', am: 'የእርስዎ ዝርዝሮች', or: 'Ibsaa keessan' },
  yours: { en: 'Yours', am: 'ያንተር', or: 'Keessan' },
  browse_listings_sub: {
    en: 'Browse amazing products from verified merchants',
    am: 'ከተረጹዋት ነጋዚዎች የተለያዩ እቃዎችን ይቃኙ',
    or: 'Madallii warra kan fayyadamu keessaa ilaali',
  },
  parking_label: { en: 'Parking', am: 'ፓርኪንግ', or: 'Paarkingii' },
  food_label: { en: 'Food', am: 'ምግብ', or: 'Nyaata' },
  delala_label: { en: 'Property', am: 'ደላላ', or: 'Dallaala' },
  ekub_label: { en: 'Ekub', am: 'እቁብ', or: 'Iquubii' },
  market_label: { en: 'Market', am: 'ገበያ', or: 'Gabaa' },

  // Generic UI
  see_all: { en: 'See All', am: 'ሁሉንም ይመልከቱ', or: 'Hundaa ilaali' },
  manage: { en: 'Manage', am: 'አስተዳድር', or: 'Geggeessi' },
  credit_score_title: { en: 'Credit Score', am: 'የክሬዲት ነጥብ', or: 'Qabxii Kireeditii' },
  member: { en: 'Member', am: 'ዜጋ', or: 'Lammi' },
  build_info: {
    en: 'CityLink Addis Ababa',
    am: 'CityLink Addis Ababa',
    or: 'CityLink Addis Ababa',
  },

  // Enhanced Greetings for Addis Ababa
  good_morning: { en: 'Good Morning', am: 'እንዳምጽ አደረም ☀️', or: 'Akam bulte ☀️' },
  good_afternoon: { en: 'Good Afternoon', am: 'እንዳምጽ ዋለት 🌤️', or: 'Akam oolte 🌤️' },
  good_evening: { en: 'Good Evening', am: 'እንዳምጽ አመሰግናል 🌙', or: 'Akam galte 🌙' },
  'just now': { am: 'አሁን', or: 'Amma' },
  'm ago': { am: 'ደቂቃ በፊት', or: 'Daqiiqaa dura' },
  'h ago': { am: 'ሰዓት በፊት', or: "Sa'aatii dura" },
  'd ago': { am: 'ቀን በፊት', or: 'Guyyaa dura' },

  // Merchant Portal
  merchant_portal_title: { am: 'የነጋዴ ፖርታል', or: 'Kallattii Daldalaa' },
  total_revenue: { am: 'ጠቅላላ ገቢ', or: 'Galii Waliigalaa' },
  sales_today: { am: 'የዛሬ ሽያጭ', or: "Gurgurtaa Har'aa" },
  store_rating: { am: 'የሱቅ ደረጃ', or: 'Sadarkaa Suuqii' },
  sales: { am: 'ሽያጭ', or: 'Gurgurtaa' },
  inventory: { am: 'ኢንቬንተሪ', or: 'Kuusa' },
  recent_sales: { am: 'የቅርብ ጊዜ ሽያጮች', or: 'Gurgurtaa dhihoo' },
  completed: { am: 'ተጠናቋል', or: 'Xumurame' },
  pending: { am: 'በሂደት ላይ', or: 'Eegamaa' },
  no_listings_yet: { am: 'ምንም አይነት ምርት እስካሁን የለም።', or: 'Meeshaan gurgurtaa hin jiru.' },
  add_product: { am: 'ምርት ጨምር', or: 'Meeshaa dabari' },
  print_qr: { am: 'የሱቁን QR አትም', or: 'QR Suuqii Maxxansi' },
  print_qr_desc: {
    am: 'ከደንበኞች ክፍያ ለመቀበል የእርስዎን ልዩ የሱቅ QR ኮድ ያውርዱ።',
    or: 'Kaffaltii fudhaachuuf koodii QR keessan buufadhaa.',
  },

  // Food / Dining Module
  food_delivery_title: { am: 'ምግብ ማዘዣ', or: 'Nyaata Ajajuu' },
  rests_near_you: { am: 'በአቅራቢያዎ ያሉ ምግብ ቤቶች', or: 'Nyaata dhihoo' },
  no_rests_title: { am: 'ምንም ምግብ ቤት የለም', or: 'Nyaata hin jiru' },
  no_rests_sub: {
    am: 'ነጋዴዎች እስካሁን ምንም አይነት ምግብ ቤት አላስመዘገቡም።',
    or: 'Daldaltoonni nyaata hin galmeessine.',
  },
  no_menu_avail: { am: 'ምንም አይነት ሜኑ እስካሁን የለም።', or: 'Baafanni nyaataa hin jiru.' },
  delicious_meal: { am: 'ጣፋጭ ምግብ', or: "Nyaata mi'aawaa" },

  // Marketplace Escrow
  no_desc: { am: 'ምንም መግለጫ አልተሰጠም።', or: 'Ibsi hin jiru.' },
  escrow_info: {
    am: 'እቃው መድረሱን እስኪያረጋግጡ ድረስ ገንዘቡ በታማኝነት (escrow) ይያዛል።',
    or: 'Kaffaltiin keessan amanamummaan (escrow) qabama.',
  },
  msg_soon: { am: 'መልእክት መላላኪያ በቅርቡ ይጀምራል', or: 'Ergaa barreeffamaa dhiyootti' },
  pin_required_desc: {
    am: 'ከ %{amt} ETB በላይ ለሆኑ ግዢዎች የእርስዎን PIN ማስገባት ያስፈልጋል።',
    or: "Kaffaltii %{amt} ETB olta'uuf koodii PIN barbaachisaadha.",
  },
  escrow_success_title: { am: 'የታማኝነት ክፍያ (Escrow) ጀምሯል', or: 'Kaffaltiin amanamummaa eegaleera' },
  pin_share_instruction: {
    am: 'እቃውን ሲረከቡ ይህንን የደህንነት PIN ለሻጩ ይስጡ፡',
    or: 'Koodii PIN kana kaffaltii xumuruuf daldalaaf kennaa:',
  },
  pin_confirm_warning: {
    am: 'ሻጩ እቃውን መላኩን ካረጋገጠ በኋላ ይህንን PIN ለግምገማ ይጠቀሙበታል።',
    or: 'Koodii PIN kanaan kaffaltii keessan xumuruu dandeessu.',
  },

  // Marketplace Categories
  cat_all: { en: 'All', am: 'ሁሉ', or: 'Hundaa' },
  cat_electronics: { en: 'Electronics', am: 'ኤሌክትሮኒክስ', or: 'Elektirooniksii' },
  cat_clothing: { en: 'Clothing', am: 'አለበስብ', or: 'Madda' },
  cat_furniture: { en: 'Furniture', am: 'የቤት ንዥረት', or: 'Mooqa' },
  cat_food: { en: 'Food', am: 'ምግብ', or: 'Nyaata' },
  cat_books: { en: 'Books', am: 'መጽሐፍት', or: 'Kitaaba' },
  cat_other: { en: 'Other', am: 'ሌሎ', or: 'Kan bira' },

  // Marketplace Placeholders
  title: { en: 'Title', am: 'አርን', or: 'Maqaalee' },
  title_ph: { en: 'Product title...', am: 'የእቃው አርን...', or: 'Maqaalee meeshaa...' },
  description: { en: 'Description', am: 'መግለጫ', or: 'Ibsa' },
  desc_ph: { en: 'Describe your product...', am: 'እቃውዎን ይግለጉ...', or: 'Meeshaakeen ibsi...' },
  category: { en: 'Category', am: 'ምድብ', or: 'Madda' },
  condition: { en: 'Condition', am: 'ሁኔታ', or: 'Akkamni' },
  cond_new: { en: 'New', am: 'አዲስ', or: 'Haara' },
  'cond_like-new': { en: 'Like New', am: 'እንደስ ይመልል', or: 'Haara fakkaatu' },
  cond_good: { en: 'Good', am: 'ጥሩ', or: 'Gaari' },
  cond_fair: { en: 'Fair', am: 'ተማማኝ', or: 'Midhaaga' },
  post_listing: { en: 'Post Listing', am: 'ዝርዝር አስገቡ', or: 'Ibsaa galchi' },
  posting: { en: 'Posting...', am: 'በማስገብ ላይ...', or: 'Galchaa jiru...' },
  price_etb: { en: 'Price (ETB)', am: 'ዋጋ (ኢቲቢ)', or: 'Gatii (ETB)' },
};

/**
 * Global translator function.
 * Reads the current language from the store automatically if no lang is passed.
 * @param {string} text - The original English string or key
 * @param {string} lang - Optional language override ('en', 'am', 'or')
 * @returns {string} The translated string or the original if not found
 */
export function t(text: string, lang?: string): string {
  if (!text) return '';

  // Auto-detect language from store if not explicitly provided
  // Lazy import to avoid circular dependencies
  let activeLang = lang;
  if (!activeLang) {
    try {
      const { useSystemStore } = require('../store/SystemStore');
      activeLang = useSystemStore.getState().lang || 'en';
    } catch {
      activeLang = 'en';
    }
  }

  // Always try to return a meaningful translation, even in English
  const entry = translations[text];

  if (activeLang && activeLang === 'en') {
    // For English, return the key if no translation exists
    if (entry && entry.en) return entry.en;
    // If no English translation exists, return a human-readable version
    return text.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  if (entry && activeLang && (entry as any)[activeLang]) {
    return (entry as any)[activeLang];
  }

  // Heuristics for currency
  if (typeof text === 'string' && text.includes(' ETB')) {
    const symbol = activeLang === 'am' ? ' ብር' : ' ETB';
    return text.replace(' ETB', symbol);
  }

  // Fallback: return human-readable version
  return text.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
}
