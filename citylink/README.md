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

CityLink uses environment variables for configuration. Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# payment keys MUST be kept server-side (e.g. Supabase Edge Functions)
# EXPO_PUBLIC_CHAPA_KEY is legacy; use server-side CHAPA_SECRET_KEY
EXPO_PUBLIC_OTP_BYPASS=false
```

> [!IMPORTANT]
> **NEVER** commit your `.env` file. Add `.env` to your `.gitignore` immediately if it isn't already there.

### Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Run all database migrations (found in `supabase/migrations`) to set up schemas and RLS policies
3. Enable Phone Auth under **Authentication → Providers**
4. Configure an SMS provider (e.g., Twilio or Africa's Talking) for OTP delivery
5. Deploy the `admin-auth` Edge Function for server-side administrative access

### Chapa Payments
1. Sign up at [chapa.co](https://chapa.co)
2. Obtain your `CHAPA_SECRET_KEY` from the dashboard
3. **Security:** Always process payments via Supabase Edge Functions to avoid exposing keys in client-side code.

---

## 📁 Project Structure

```
citylink-rn/
├── App.tsx                       # Root entry point + session bootstrap
├── app.json                      # Expo config
├── package.json
└── src/
    ├── config.ts                 # Constants and feature flags
    ├── theme.ts                  # Design tokens (Ethiopian Noir palette)
    ├── navigation/
    │   └── index.tsx             # Full navigation: Auth → role-based routing
    ├── store/
    │   ├── AppStore.ts           # Unified Zustand global state
    │   └── SecurePersist.ts      # Secure storage for sensitive keys
    ├── services/
    │   ├── supabase.ts           # Supabase client + query wrappers
    │   ├── fayda-kyc.service.ts  # Fayda national ID verification
    │   └── auth.service.ts       # OTP and Auth flows
    ├── types/
    │   └── domain_types.ts       # Core TypeScript interfaces matching DB schema
    ├── components/               # Shared UI components
    └── screens/                  # Feature screens (.tsx)
```

---

## 🌟 Features Implemented

| Feature | Status |
|---------|--------|
| OTP Authentication (bypass mode) | ✅ |
| Citizen & Merchant registration | ✅ |
| Wallet: top-up, send, history | ✅ |
| Fayda KYC identity verification | ✅ |
| Marketplace (browse + post) | ✅ |
| Parking: spot grid, session, QR | ✅ |
| LRT tap-in/out + fare calc | ✅ |
| Food delivery (order + track) | ✅ |
| Job listings + one-tap apply | ✅ |
| Ekub savings circles | ✅ |
| Delala real-estate listings | ✅ |
| Tonight / Events discovery | ✅ |
| Send money P2P | ✅ |
| AI assistant (Claude API) | ✅ |
| Dark/light theme toggle | ✅ |
| EN/Amharic language toggle | ✅ |
| Merchant dashboard (all types) | ✅ |
| Admin server-side auth panel | ✅ |
| Zustand unified global state | ✅ |
| AsyncStorage session persistence | ✅ |
| Supabase realtime subscriptions | ✅ |

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

- [ ] Ensure `EXPO_PUBLIC_OTP_BYPASS=false` (Mandatory for production)
- [ ] Configure Supabase SMS provider
- [ ] Verify all tables have active Row Level Security (RLS) policies
- [ ] Deploy Edge Functions (`npx supabase functions deploy`)
- [ ] Configure Expo EAS Build for app store deployment
- [ ] Add real app icons and splash screen
- [ ] Set up Sentry for error tracking

---

## 📄 License
CityLink — built for Addis Ababa 🇪🇹
