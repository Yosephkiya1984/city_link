/**
 * AI Service — CityLink assistant powered by Claude
 *
 * WHY A PROXY?
 * Anthropic API keys must never be embedded in a mobile app bundle — the
 * binary can be extracted and the key abused. All requests must go through
 * a thin server-side proxy that holds the key securely.
 *
 * RECOMMENDED PROXY: Supabase Edge Function
 * 1. Create supabase/functions/ai-chat/index.ts (template below)
 * 2. Deploy: `supabase functions deploy ai-chat`
 * 3. Set secret: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
 * 4. Update PROXY_URL in src/config.js
 *
 * EDGE FUNCTION TEMPLATE (supabase/functions/ai-chat/index.ts):
 * ─────────────────────────────────────────────────────────────
 * import { serve } from "https://deno.land/std/http/server.ts";
 * serve(async (req) => {
 *   const { messages, system } = await req.json();
 *   const res = await fetch("https://api.anthropic.com/v1/messages", {
 *     method: "POST",
 *     headers: {
 *       "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
 *       "anthropic-version": "2023-06-01",
 *       "content-type": "application/json",
 *     },
 *     body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 600, system, messages }),
 *   });
 *   const data = await res.json();
 *   return new Response(JSON.stringify(data), {
 *     headers: { "Content-Type": "application/json",
 *                "Access-Control-Allow-Origin": "*" },
 *   });
 * });
 * ─────────────────────────────────────────────────────────────
 */

import { Config } from '../config';

const SYSTEM_PROMPT = `You are CityLink AI, a helpful assistant for residents of Addis Ababa, Ethiopia.
You help citizens navigate city services: LRT (light rail), parking, food delivery, job search,
ekub savings circles, delala real estate, exchange rates, emergency services, and more.
Always be friendly, concise, and culturally aware. Mention Ethiopian context where relevant
(Birr currency, sub-cities, local businesses). Keep responses short and actionable.`;

/**
 * sendMessage — sends a conversation to the AI proxy and returns the reply.
 * Falls back to local canned answers if the proxy is not configured or fails.
 *
 * @param {Array<{role:'user'|'assistant', content:string}>} messages
 * @returns {Promise<string>} assistant reply text
 */
export async function sendMessage(messages) {
  const proxyUrl = Config.aiProxyUrl;

  if (proxyUrl && !proxyUrl.startsWith('REPLACE')) {
    try {
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, system: SYSTEM_PROMPT }),
      });

      if (!res.ok) throw new Error(`Proxy responded ${res.status}`);
      const data = await res.json();
      const text = data.content?.[0]?.text;
      if (text) return text;
      throw new Error('Empty response from proxy');
    } catch (e) {
      console.warn('[CityLink AI] Proxy failed:', e.message, '— using fallback');
    }
  }

  // ── Offline / unconfigured fallback ──────────────────────────────────────
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  return getFallbackResponse(lastUserMsg);
}

// ── Local canned responses ────────────────────────────────────────────────────
function getFallbackResponse(msg) {
  const m = msg.toLowerCase();

  if (m.includes('lrt') || m.includes('rail') || m.includes('light rail'))
    return 'The Addis Ababa LRT has two lines:\n\n🟢 North–South: Menelik II Square ↔ Lebu\n🔵 East–West: Ayat ↔ Akaki\n\nUse the Rail screen to tap in/out with your digital wallet. Base fare is 2 ETB, then 0.45 ETB/km.';

  if (m.includes('park'))
    return "🅿️ Open the Parking screen, pick a lot, and tap any green spot to start a session. You're billed per hour when you end the session. Rates: 10–15 ETB/hr depending on location.";

  if (
    m.includes('usd') ||
    m.includes('dollar') ||
    m.includes('exchange') ||
    m.includes('rate') ||
    m.includes('birr')
  )
    return '💱 Approximate rates today:\n1 USD ≈ 57 ETB\n1 EUR ≈ 62 ETB\n1 GBP ≈ 72 ETB\n1 SAR ≈ 15.2 ETB\n\nCheck the Exchange screen for the full live table.';

  if (m.includes('ekub'))
    return "🤝 Ekub is Ethiopia's traditional rotating savings system. A group of people contribute equally each period, and one member receives the full pot each round.\n\nCityLink makes it digital — browse circles on the Ekub screen, join with one tap, and contributions are tracked automatically.";

  if (m.includes('job') || m.includes('work') || m.includes('hire') || m.includes('employ'))
    return '💼 The Jobs screen lists current openings across Tech, Finance, Healthcare, Hospitality, and more.\n\nTap any job to see details and apply instantly. Your applications are tracked — check your status under Jobs → My Applications.';

  if (m.includes('food') || m.includes('delivery') || m.includes('restaurant') || m.includes('eat'))
    return '🍽️ Open the Food screen to order from restaurants near you. Add items to your cart, place the order, and track its status in My Orders. Payment is deducted from your CityLink wallet.';

  if (
    m.includes('emergency') ||
    m.includes('police') ||
    m.includes('ambulance') ||
    m.includes('fire')
  )
    return '🚨 Emergency Numbers:\n🚓 Police: 991\n🚒 Fire: 939\n🚑 Ambulance: 907\n📞 General: 116\n\nOpen the Emergency screen for one-tap calling.';

  if (m.includes('wallet') || m.includes('top up') || m.includes('topup') || m.includes('balance'))
    return '💳 To top up your wallet:\n1. Tap ⬆️ Top Up on the Home screen (or open Wallet)\n2. Choose an amount\n3. Select your payment channel (Telebirr, CBE Birr, Awash Bank…)\n4. Confirm payment\n\nFunds appear instantly.';

  if (m.includes('send') || m.includes('transfer') || m.includes('pay'))
    return '📤 To send money: Home → Send → pick a contact or enter a phone number → enter amount → confirm.\n\nThe recipient must also have a CityLink account.';

  if (
    m.includes('delala') ||
    m.includes('house') ||
    m.includes('apartment') ||
    m.includes('rent') ||
    m.includes('property')
  )
    return '🏠 The Delala screen lists apartments for rent, properties for sale, commercial spaces, and land across Addis Ababa sub-cities. Filter by category and tap any listing to contact the agent directly.';

  if (
    m.includes('salon') ||
    m.includes('barber') ||
    m.includes('clinic') ||
    m.includes('doctor') ||
    m.includes('appointment')
  )
    return '💈 The Services screen lets you book appointments at salons, barbershops, and medical clinics near you. Filter by type, pick a provider, and confirm your slot — no phone call needed.';

  if (
    m.includes('tonight') ||
    m.includes('event') ||
    m.includes('concert') ||
    m.includes('nightlife')
  )
    return "🌙 The Tonight screen shows what's happening in Addis today — live music, theatre, rooftop bars, markets, and cultural events. Filter by category and tap any spot for details and directions.";

  if (m.includes('kyc') || m.includes('fayda') || m.includes('verify') || m.includes('identity'))
    return '🆔 To verify your identity with Fayda:\n1. Open Profile → Verify Identity (KYC)\n2. Enter your 12-digit Fayda FIN\n3. Enter your full name as it appears on your ID\n\nVerification unlocks higher wallet limits and premium services.';

  if (m.includes('hello') || m.includes('hi') || m.includes('hey') || m.includes('selam'))
    return "Selam! 👋 I'm CityLink AI. I can help you with LRT, parking, jobs, food delivery, ekub savings, real estate, exchange rates, and more.\n\nWhat can I help you with today?";

  return "I'm here to help with Addis Ababa city services! Ask me about:\n🚇 LRT & transport\n🅿️ Parking\n🍽️ Food delivery\n💼 Jobs\n🏠 Delala listings\n🤝 Ekub circles\n💱 Exchange rates\n🚨 Emergency numbers\n\nWhat do you need?";
}
