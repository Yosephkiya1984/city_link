# CityLink — React Native App
**Addis Ababa's Digital City Services Platform**

A full-featured React Native / Expo conversion of CityLink — a comprehensive city services app for Addis Ababa, Ethiopia.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
- iOS Simulator (macOS) or Android Studio emulator, or the Expo Go app on your phone

### Installation

```bash
cd citylink-rn
npm install
npx expo start
```

Press `i` for iOS, `a` for Android, or scan the QR code with Expo Go.

---

## 🔑 Credentials Setup

Before deploying, fill in `src/config.js`:

```js
export const Config = {
  supaUrl:   'https://YOUR_PROJECT.supabase.co',
  supaKey:   'eyJ...',          // Supabase anon key
  chapaKey:  'CHAPUBK_TEST_...', // Chapa payment key
  adminCode: 'your-admin-code',
  devMode:   false,              // Set false for production
  otpBypass: false,              // Set false + configure Supabase SMS
};
```

### Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Run `citylink_schema_fixed.sql` in the SQL Editor
3. Enable Phone Auth under Authentication → Providers
4. Configure an SMS provider (Twilio / Africa's Talking)
5. Copy your project URL and anon key into `config.js`

### Chapa Payments
1. Sign up at [chapa.co](https://chapa.co)
2. Get your `CHAPUBK_TEST_...` key from the dashboard
3. **Note:** Chapa API requires a backend proxy (CORS). Create a simple Express/Hono proxy or use Supabase Edge Functions.

---

## 📁 Project Structure

```
citylink-rn/
├── App.js                        # Root entry point + session bootstrap
├── app.json                      # Expo config
├── babel.config.js
├── package.json
└── src/
    ├── config.js                 # All constants, credentials, demo data
    ├── theme.js                  # Design tokens (Ethiopian Noir palette)
    ├── navigation/
    │   └── index.js              # Full navigation: Auth → role-based routing
    ├── store/
    │   └── AppStore.js           # Zustand global state
    ├── services/
    │   ├── supabase.js           # Full Supabase client + all queries
    │   ├── chapa.js              # Chapa payment gateway
    │   └── fayda.js              # Fayda national ID verification
    ├── utils/
    │   └── index.js              # Format helpers, LRT fare calc, etc.
    ├── components/
    │   ├── index.js              # CButton, CInput, Card, Toast, TabBar…
    │   └── TopBar.js             # Shared top navigation bar
    └── screens/
        ├── AuthScreen.js         # OTP login + registration (citizen/merchant)
        ├── HomeScreen.js         # Wallet hero + city services grid
        ├── WalletScreen.js       # Balance, top-up, transaction history
        ├── MarketplaceScreen.js  # Browse & post listings
        ├── ParkingScreen.js      # Lot map, spot selection, active session, QR
        ├── RailScreen.js         # LRT tap-in/out + EDR intercity booking
        ├── JobsScreen.js         # Job listings, search, apply
        ├── EkubScreen.js         # Ethiopian savings circles
        ├── AIScreen.js           # Claude-powered city assistant chat
        ├── ProfileScreen.js      # User info, KYC (Fayda), settings, logout
        ├── DelalaScreen.js       # Real-estate listings
        ├── misc-screens.js       # Food, Dining, Transport, Minibus, Tonight,
        │                         #   Emergency, Exchange (all in one file)
        ├── FoodScreen.js         # → re-exports from misc-screens
        ├── DiningScreen.js       # → re-exports from misc-screens
        ├── TransportScreen.js    # → re-exports from misc-screens
        ├── MinibusScreen.js      # → re-exports from misc-screens
        ├── TonightScreen.js      # → re-exports from misc-screens
        ├── EmergencyScreen.js    # → re-exports from misc-screens
        ├── ExchangeScreen.js     # → re-exports from misc-screens
        ├── utility-screens.js    # Notifications, MyOrders, SendMoney,
        │                         #   Services, CV, CityServices
        ├── NotificationsScreen.js # → re-exports
        ├── MyOrdersScreen.js      # → re-exports
        ├── SendMoneyScreen.js     # → re-exports
        ├── ServicesScreen.js      # → re-exports
        ├── CVScreen.js            # → re-exports
        ├── CityServicesScreen.js  # → re-exports
        ├── MerchantScreen.js     # Full merchant dashboard (all types)
        ├── StationScreen.js      # LRT station operator dashboard
        ├── InspectorScreen.js    # Ticket scanner + penalty management
        └── AdminScreen.js        # Minister/admin panel + merchant review
```

---

## 🌟 Features Implemented

| Feature | Status |
|---------|--------|
| OTP Authentication (bypass mode) | ✅ |
| Citizen & Merchant registration | ✅ |
| Wallet: top-up, send, history | ✅ |
| Chapa payment gateway (simulated) | ✅ |
| Fayda KYC identity verification | ✅ |
| Marketplace (browse + post) | ✅ |
| Parking: spot grid, session, QR | ✅ |
| LRT tap-in/out + fare calc | ✅ |
| EDR intercity train booking | ✅ |
| Minibus route finder | ✅ |
| Food delivery (order + track) | ✅ |
| Restaurant reservations | ✅ |
| Job listings + one-tap apply | ✅ |
| Ekub savings circles | ✅ |
| Delala real-estate listings | ✅ |
| Tonight / Events discovery | ✅ |
| Emergency services + contacts | ✅ |
| Currency exchange rates | ✅ |
| Salon / clinic booking | ✅ |
| Send money P2P | ✅ |
| CV / resume builder | ✅ |
| AI assistant (Claude API) | ✅ |
| Notification centre | ✅ |
| Dark/light theme toggle | ✅ |
| EN/Amharic language toggle | ✅ |
| Merchant dashboard (all types) | ✅ |
| Station operator dashboard | ✅ |
| Inspector ticket scanner | ✅ |
| Admin merchant review panel | ✅ |
| Zustand global state | ✅ |
| AsyncStorage session persistence | ✅ |
| Supabase realtime subscriptions | ✅ (via supabase.js) |

---

## 🎨 Design System

The app uses the **Addis Noir** palette — a dark-first design inspired by Ethiopian Modernism:

- **Primary green** `#00A86B` — Ethiopian flag green
- **Accent gold** `#F5B800` — Ethiopian flag gold  
- **Danger red** `#E8312A` — Ethiopian flag red
- **Info blue** `#2D7EF0` — Habesha blue
- **Premium purple** `#8B5CF6` — Aksumite purple

---

## 🏗️ Production Checklist

- [ ] Replace all `REPLACE_ME_*` values in `src/config.js`
- [ ] Set `devMode: false` and `otpBypass: false`
- [ ] Configure Supabase SMS provider (Twilio / Africa's Talking)
- [ ] Set up Chapa backend proxy (avoid CORS issues)
- [ ] Run schema SQL: `citylink_schema_fixed.sql`
- [ ] Enable Supabase Row Level Security (RLS) policies
- [ ] Configure Expo EAS Build for app store deployment
- [ ] Add real app icons and splash screen
- [ ] Set up Sentry for error tracking (`sentryDsn` in config)

---

## 📄 License
CityLink — built for Addis Ababa 🇪🇹
