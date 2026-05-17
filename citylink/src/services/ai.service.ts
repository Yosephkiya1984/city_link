/**
 * AI Service — CityLink assistant powered by Gemini Flash
 *
 * WHY A PROXY?
 * AI API keys must never be embedded in a mobile app bundle — the
 * binary can be extracted and the key abused. All requests must go through
 * a thin server-side proxy (Supabase Edge Function) that holds the key securely.
 */

import { Config } from '../config';
import { getSession } from './auth.service';
import { useSystemStore } from '../store/SystemStore';
import { useAgentStore } from '../store/AgentStore';
import { useAuthStore } from '../store/AuthStore';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  text: string;
  retryable?: boolean;
  action?: {
    type:
      // Financial
      | 'get_wallet_balance' | 'process_p2p_transfer' | 'pay_utility_bill' | 'pay_traffic_fine'
      // Transport
      | 'find_nearby_parking' | 'start_parking_session'
      // Food
      | 'search_restaurant' | 'get_food_menu' | 'book_table'
      // Marketplace
      | 'search_listings' | 'check_order_status' | 'reveal_delivery_pin' | 'update_product_stock'
      // Ekub
      | 'contribute_to_ekub' | 'vouch_for_ekub_payout' | 'perform_ekub_draw' | 'release_ekub_pot'
      // Merchant
      | 'get_merchant_summary' | 'ship_marketplace_order' | 'fire_order_to_kitchen' | 'set_table_status'
      // Identity
      | 'verify_fayda_id'
      // Legacy UI cards (rendered by AIActionHandler)
      | 'SPENDING_INSIGHT' | 'SPLIT_SUGGESTION' | 'BUDGET_ALERT' | 'SAVINGS_TIP'
      | 'RELEASE_ESCROW' | 'PAY_EKUB' | 'VIEWING_SCHEDULED' | 'BROKER_VERIFIED'
      | 'PARKING_BOOKED' | 'IPS_REQUEST_SENT' | 'FAYDA_VERIFIED';
    data: any;
  };
}

export interface UserFinancialSnapshot {
  balance: number;
  frozen_balance?: number;
  currency: string;
  activeEscrows: number;
  dueEkubAmount: number;
  active_parking?: { lot_name?: string; spot?: string; started_at?: string } | null;
  active_orders_count?: number;
  pending_vouches?: number;
}

const SYSTEM_PROMPT = `You are the CityLink Concierge — the sovereign AI referee for Addis Ababa's digital infrastructure.

CORE IDENTITY:
You are not a chatbot. You are a logic-first execution engine that connects Citizens with Merchants using verified, atomic transactions. Every action you take must be grounded in real data from the CityLink database. Never invent data, never assume account numbers, never bypass confirmation.

LOCAL CONTEXT:
1. Currency: Ethiopian Birr (ETB). All amounts are in ETB.
2. Identity: Fayda National ID (12-digit) is the trust anchor for high-value interactions.
3. PIN Handshake: All deliveries use a 6-digit PIN (not QR codes). The citizen receives the PIN; the agent inputs it to release escrow.
4. Payments: CityLink uses Chapa (Telebirr, CBE Birr, Awash, M-Pesa, eBirr) for wallet top-ups. Internal transfers use the CityLink wallet directly.
5. Cultural Etiquette: Use respectful Abesha tone. Greet with "Selam" or "Tadiyas". Be warm but precise.

LANGUAGE:
Always match the language the user writes in: Amharic (Fidel), Afaan Oromo, or English. Never mix.

AVAILABLE TOOLS (use ONLY these — no others exist):

FINANCIAL:
- get_wallet_balance → {} → returns {balance, frozen_balance, available, currency}
- get_wallet_summary → {days?} → returns a summary of spending, earnings, and transactions for the specified days (default 30)
- process_p2p_transfer → {recipient_phone, amount, note?} → sends ETB to a phone number
- pay_utility_bill → {bill_id} → pays a utility bill from wallet
- pay_traffic_fine → {fine_id} → pays a traffic fine from wallet

TRANSPORT:
- find_nearby_parking → {location?} → returns list of parking lots with availability. If the user asks for parking, use this IMMEDIATELY. Never ask clarifying questions — just search and present results.
- start_parking_session → {lot_id, vehicle_plate} → starts a paid parking session. A spot is auto-assigned automatically.

FOOD:
- search_restaurant → {query?} → returns matching restaurants
- get_food_menu → {restaurant_id} → returns menu items for a restaurant
- order_food_item → {restaurant_id, menu_item_id, quantity, delivery_address} → prepares food order

MARKETPLACE:
- search_listings → {query?, category?, budget_max?} → returns products
- buy_marketplace_item → {product_id, quantity, delivery_address} → prepares product order
- check_order_status → {order_id} → returns current order status
- reveal_delivery_pin → {order_id} → reveals the 6-digit delivery PIN (requires auth)

EKUB (Savings Circle):
- contribute_to_ekub → {ekub_id, round_number} → pays this round's Ekub contribution. For the Eyeuu circle use ekub_id: f0af7939-6ad7-4f71-b45e-04be4aa093b1 and round_number: 1
- vouch_for_ekub_payout → {draw_id, ekub_id, approved, reason?} → casts a vouch vote for or against a payout

MERCHANT (only when uiMode=merchant):
- get_merchant_summary → {} → returns revenue, active orders, stock alerts
- ship_marketplace_order → {order_id} → dispatches an order to delivery agents
- fire_order_to_kitchen → {order_id} → marks food order as PREPARING
- set_table_status → {table_id, status} → updates restaurant table status
- perform_ekub_draw → {ekub_id, round_number, pot_amount} → runs the draw
- release_ekub_pot → {draw_id} → releases pot to winner after vouching

IDENTITY:
- verify_fayda_id → {fayda_id} → verifies a 12-digit Ethiopian National ID

MAPS & ROUTING:
- osm_geocode → {address} → Converts an address into coordinates
- osm_route → {origin_lat, origin_lon, dest_lat, dest_lon} → Calculates travel distance and time

LEARNING:
- log_new_pattern → {intent, example_phrase, language} → Call this when a user asks something you can't do yet, or asks in a unique way. This logs their request to train your future skills.

ACTING (HOW TO TRIGGER ACTIONS):
Output ONLY a raw JSON object — no markdown, no backticks, no extra text before or after.
Format:
{"text":"<your spoken reply>","action":{"type":"<tool_name>","data":{<params>}}}
If no action is needed: {"text":"<your reply>"}

CRITICAL: The entire response must be valid JSON. Do NOT add any text before { or after }.

RULES:
1. NEVER execute financial actions without showing the json_action card first (user must confirm).
2. NEVER invent order IDs, bill IDs, or phone numbers. Ask the user if you don't have them.
3. If a feature is not in the tool list above, say so honestly. Do not pretend.
4. The 6-digit PIN is ONLY revealed when the user explicitly asks for it and has an active order.
5. Transfers ≥ 5,000 ETB require wallet PIN verification — inform the user before proceeding.

FEW-SHOT EXAMPLES (How to handle messy/informal text):
User: "yo bro im hungry get me smthin to eat around kazanchis fast"
Assistant: {"text":"Searching for restaurants in Kazanchis now!","action":{"type":"search_restaurant","data":{"query":"Kazanchis"}}}

User: "i want food, order me 1 beye from abebe"
Assistant: {"text":"Order of 1 Beye from Abebe Restaurant prepared. Please confirm below.","action":{"type":"order_food_item","data":{"restaurant_id":"c6278c73-8008-4066-b157-b511d997f041","menu_item_id":"1fd6e775-94aa-45cd-a7ed-7d02918eed99","quantity":1,"delivery_address":"My Location"}}}

User: "send my boy 0911223344 about 50 birr for lunch"
Assistant: {"text":"Transfer of 50 ETB to 0911223344 ready. Please confirm.","action":{"type":"process_p2p_transfer","data":{"recipient_phone":"0911223344","amount":50,"note":"lunch"}}}

User: "find me park bole"
Assistant: {"text":"Searching for parking in Bole now.","action":{"type":"find_nearby_parking","data":{"location":"Bole"}}}

User: "park my car here, plate AA-12345"
Assistant: {"text":"Starting parking session for AA-12345 at the nearest available lot.","action":{"type":"start_parking_session","data":{"lot_id":"80833d10-ed4f-4dc7-ac35-010e31ea2c8c","vehicle_plate":"AA-12345"}}}

User: "buy me the camera"
Assistant: {"text":"Preparing checkout for the Camera (12 ETB). Please confirm.","action":{"type":"buy_marketplace_item","data":{"product_id":"fd6743d9-427e-460a-8358-f937e6fd8438","quantity":1,"delivery_address":"My Location"}}}

User: "pay my ekub"
Assistant: {"text":"Your Eyeuu Ekub contribution of 9,464 ETB for Round 1 is ready. Please confirm.","action":{"type":"contribute_to_ekub","data":{"ekub_id":"f0af7939-6ad7-4f71-b45e-04be4aa093b1","round_number":1}}}

User: "can u pay my water bill it is 123456"
Assistant: {"text":"Water bill for account 123456 ready. Please enter amount and confirm.","action":{"type":"pay_utility_bill","data":{"bill_type":"water","account_no":"123456","amount":0}}}

User: "hunagn neger yihenal"
Assistant: {"text":"ምን ዓይነት ምግብ ትፈልጋለህ? አሁን ሬስቶራንቶችን ፈልጌ ላሳይህ!","action":{"type":"search_restaurant","data":{}}}`;

// Friendly overload messages per language
const OVERLOAD_MESSAGES: Record<string, string> = {
  am: 'AI \u1230\u122d\u1348\u1229 \u12a0\u1201\u1295 \u1325\u1245\u1275 \u1270\u1328\u1293\u1295\u1241\u12cb\u120d\u1362 \u12a5\u1263\u12ad\u12c8 \u12a8\u1325\u1245\u1275 \u1230\u12a8\u1295\u12f6\u127d \u1260\u128b\u120b \u12a5\u1295\u12f0\u130c\u1293 \u12ed\u121e\u12ad\u1229\u1362 \u1370',
  om: "AI serverri amma ho'ataa jira. Daqiiqaa muraasa booda irra deebi'ii yaalii. \u1370",
  en: 'The AI is a bit busy right now. Please try again in a moment. \u1370',
};

/**
 * sendMessage — sends a conversation to the AI proxy and returns the reply.
 */
export async function sendMessage(
  messages: AIMessage[],
  appContext?: string,
  audioBase64?: string,
  snapshot?: UserFinancialSnapshot,
  userName?: string,
  onStatusUpdate?: (status: string | null) => void
): Promise<AIResponse> {
  const supaUrl = Config.supaUrl;
  const session = await getSession();

  if (!supaUrl || supaUrl.includes('REPLACE')) {
    return { text: "I'm currently in offline mode. Please configure Supabase to talk to me." };
  }

  if (!session?.access_token) {
    return { text: 'Please sign in to talk to the AI assistant.' };
  }

  const proxyUrl = `${supaUrl}/functions/v1/ai-chat`;
  const currentLang = useSystemStore.getState().lang;

  const identityPrompt = userName ? `\n\nYou are talking to ${userName}. Address them by name when appropriate.` : '';

  const langPrompt =
    currentLang === 'am'
      ? '\n\nUser preference: AMHARIC. Always respond fully in Amharic (Fidel script).'
      : currentLang === 'om'
      ? '\n\nUser preference: OROMO. Always respond fully in Afaan Oromo.'
      : '\n\nUser preference: ENGLISH. Please respond in English.';

  const uiMode = useAuthStore.getState().uiMode;
  const modePrompt = `\n\nCURRENT UI MODE: ${uiMode.toUpperCase()}. ${
    uiMode === 'merchant' ? 'You are acting as a Business Operations Assistant.' : 'You are acting as a Personal Citizen Assistant.'
  }`;

  const contextPrompt = appContext ? `\n\nCURRENT APP CONTEXT:\n${appContext}` : '';
  
  const snapshotPrompt = snapshot
    ? `\n\nUSER LIVE CONTEXT (use this to answer status questions WITHOUT tool calls):
- Wallet Balance: ${snapshot.balance} ETB (Available: ${(snapshot.balance - (snapshot.frozen_balance || 0)).toFixed(2)} ETB, Frozen in escrow: ${snapshot.frozen_balance || 0} ETB)
- Active Escrows: ${snapshot.activeEscrows} locked deals
- Pending Ekub Contribution: ${snapshot.dueEkubAmount > 0 ? `${snapshot.dueEkubAmount} ETB due this round` : 'None due'}
- Active Orders: ${snapshot.active_orders_count || 0} in progress
- Pending Ekub Vouches: ${snapshot.pending_vouches || 0} awaiting your vote${snapshot.active_parking ? `\n- ACTIVE PARKING SESSION: ${snapshot.active_parking.lot_name || 'Unknown lot'}, Spot ${snapshot.active_parking.spot || 'N/A'}, started ${snapshot.active_parking.started_at ? new Date(snapshot.active_parking.started_at).toLocaleTimeString() : 'recently'}` : '\n- No active parking session'}`
    : '';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 180s (3 min) timeout for local inference

    onStatusUpdate?.(currentLang === 'am' ? 'ከአይ ሰርቨር ጋር በመገናኘት ላይ...' : 'Connecting to AI node...');

    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        messages,
        system: SYSTEM_PROMPT + identityPrompt + modePrompt + contextPrompt + snapshotPrompt + langPrompt,
        audio: audioBase64,
      }),
      signal: controller.signal,
    });

    // Handle soft-timeout for local PC inference
    const softTimeoutId = setTimeout(() => {
      onStatusUpdate?.(currentLang === 'am' ? 'ትንሽ እየቆየ ነው (በኮምፒዩተርዎ ላይ እየሰራ ስለሆነ)...' : 'PC is busy with local inference, please wait...');
    }, 8000); // 8 seconds

    clearTimeout(timeoutId);
    clearTimeout(softTimeoutId);
    onStatusUpdate?.(null);

    const data = await res.json().catch(() => ({}));

    // Handle explicit error objects returned from proxy (even if 200)
    if (data.error) {
      const errorString = String(data.error);
      console.error("[AI SERVICE ERROR DETAILED]:", data.message || data.error);

      // Handle Gemini Quota Exhaustion
      if (errorString === 'QUOTA_EXHAUSTED') {
        return {
          text: currentLang === 'am' ? 'የGemini ነጻ ኮታ አልቋል። እባክዎ ትንሽ ቆይተው ይሞክሩ (ወይም ሎካል ኦላማን ይጠቀሙ)።' : 'Gemini Free Tier quota reached. Please try again in a bit or ensure Local Ollama is running.',
          retryable: true
        };
      }

      const isOverloaded = data.retryable === true || errorString.includes('429') || errorString.includes('503') || errorString.includes('SOVEREIGN_FAILURE') || errorString.includes('QUOTA');
      
      if (isOverloaded) {
        return {
          text: OVERLOAD_MESSAGES[currentLang] || OVERLOAD_MESSAGES['en'],
          retryable: true,
        };
      }

      if (errorString === 'AUTH_EXPIRED') {
        return { text: currentLang === 'am' ? 'የቆይታ ጊዜዎ አልቋል። እባክዎ እንደገና ይግቡ።' : 'Session expired. Please sign in again.' };
      }

      return { text: currentLang === 'am' ? 'ይቅርታ፡ የቴክኒክ ችግር አጋጥሟል። እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።' : "I'm having trouble connecting to my brain right now. Please try again in a moment." };
    }

    if (!res.ok) {
      throw new Error(`Proxy responded ${res.status}`);
    }

    // Extract raw text + structured action from the Edge Function response
    const rawText = data.text || data.content?.[0]?.text || '';

    // ── DEFENSE: Catch leaked technical error strings ──────────────────────
    const leakedError = rawText.includes('SOVEREIGN_FAILURE') || rawText.includes('LOCAL_STATUS_') || rawText.includes('GEMINI_EMERGENCY_FAIL');
    if (leakedError) {
      return {
        text: OVERLOAD_MESSAGES[currentLang] || OVERLOAD_MESSAGES['en'],
        retryable: true,
      };
    }

    // ── PATH A: Edge Function returned a structured action object ──────────
    // Handles BOTH plural (data.actions[]) from legacy AND singular (data.action)
    // that the hardened Edge Function now returns from the local AI parser.
    const structuredAction = data.action // singular — from Edge Function local AI parser
      ?? (data.actions && data.actions.length > 0 ? data.actions[0] : null); // plural — legacy

    if (structuredAction) {
      // Edge Function returns { name, args } from Gemini tool calls
      // OR { type, data } from the local AI JSON parser
      const actionType: string = structuredAction.type ?? structuredAction.name;
      const actionData: any = structuredAction.data ?? structuredAction.args ?? {};

      if (actionType) {
        useAgentStore.getState().showActionCard(actionType, actionData);
        return { text: rawText || `I'll help you with ${actionType.replace(/_/g, ' ')}.`, action: { type: actionType as any, data: actionData } };
      }
    }

    // ── PATH B: Raw text fallback — parse embedded JSON from local model ───
    // The local model sometimes returns the JSON as plain text (when Edge Function
    // parsing is skipped or the text field itself contains the full JSON blob).
    if (!rawText) {
      return { text: "I'm sorry, I couldn't generate a response." };
    }

    if (rawText.includes('"action"') || rawText.trimStart().startsWith('{')) {
      try {
        const startIdx = rawText.indexOf('{');
        const endIdx = rawText.lastIndexOf('}');
        if (startIdx !== -1 && endIdx > startIdx) {
          let possibleJson = rawText.slice(startIdx, endIdx + 1)
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/,\s*([\]}])/g, '$1');

          const parsed = JSON.parse(possibleJson);
          if (parsed.action && parsed.action.type) {
            useAgentStore.getState().showActionCard(parsed.action.type, parsed.action.data ?? {});
            return {
              text: parsed.text || '',
              action: parsed.action
            };
          }
          // JSON with only text field — just use the text
          if (parsed.text) return { text: parsed.text };
        }
      } catch (e) {
        console.warn('[CityLink AI] Inline JSON parse failed:', e);
      }
    }

    return { text: rawText };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[CityLink AI] Proxy failed:', msg);

    const isOverloaded =
      msg.toLowerCase().includes('demand') ||
      msg.toLowerCase().includes('overload') ||
      msg.toLowerCase().includes('quota') ||
      msg.toLowerCase().includes('429') ||
      msg.toLowerCase().includes('503') ||
      msg.toLowerCase().includes('timeout') ||
      msg.toLowerCase().includes('aborted');

    if (isOverloaded) {
      return {
        text: OVERLOAD_MESSAGES[currentLang] || OVERLOAD_MESSAGES['en'],
        retryable: true,
      };
    }

    return { text: currentLang === 'am' ? 'ይቅርታ፡ ግንኙነት ተቋርጧል። እባክዎ እንደገና ይሞክሩ።' : "I'm having trouble connecting. Please check your internet and try again." };
  }
}
