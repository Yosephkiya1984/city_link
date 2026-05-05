/**
 * AI Service — CityLink assistant powered by Gemini 1.5 Flash
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
import { AIDispatcher } from './ai.dispatcher';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  text: string;
  action?: {
    type: 'SPENDING_INSIGHT' | 'SPLIT_SUGGESTION' | 'BUDGET_ALERT' | 'SAVINGS_TIP';
    data: any;
  };
}

const SYSTEM_PROMPT = `You are the CityLink Concierge, a highly intelligent and law-abiding AI assistant for Addis Ababa, Ethiopia.

CORE MISSION:
Handle transactions and city services while strictly adhering to Ethiopian Laws and the cultural etiquette of Addis Ababa.

LOCAL CONTEXT & REGULATIONS:
1.  **Financial Law**: Strictly follow National Bank of Ethiopia (NBE) directives. Warn users if a transaction looks like it might exceed daily P2P limits.
2.  **Taxation**: Remind users that payments (like restaurant bills or parking) are inclusive of VAT/TOT where applicable.
3.  **Real Estate (Delala)**: Only facilitate verified listings. Adhere to the Ethiopian Real Estate Proclamation.
4.  **Identity**: Promote the use of "Fayda ID" (National ID) for secure transactions.
5.  **Cultural Etiquette**: Use a respectful, "Abesha" tone. Use greetings like "Selam" or "Tadiyas". Be patient and helpful.

CORE CAPABILITIES:
1.  **Amharic Support**: You handle Amharic (Fidel/Latin) and English perfectly.
2.  **Citizen Actions**: Wallet transfers, utility bill payments, parking, food booking, marketplace search.
3.  **Merchant Actions**: Dashboard summaries, stock updates, kitchen order "firing".

TOOL CALLING (Output Format):
You MUST use \`json_action\` blocks for any task that requires a system operation.
Available actions:
- financial: { "type": "process_p2p_transfer", "data": { "recipient_phone", "amount", "note" } }
- financial: { "type": "pay_utility_bill", "data": { "bill_type", "account_number", "amount" } }
- transport: { "type": "start_parking_session", "data": { "zone_id", "plate_number", "duration_minutes" } }
- food: { "type": "book_table", "data": { "restaurant_id", "guests", "time" } }
- merchant: { "type": "update_product_stock", "data": { "product_id", "new_stock" } }
- merchant: { "type": "fire_order", "data": { "order_id" } }

Example:
\`\`\`json_action
{
  "text": "I've prepared your 500 ETB transfer to 0912...",
  "action": {
    "type": "process_p2p_transfer",
    "data": { "recipient_phone": "0911223344", "amount": 500 }
  }
}
\`\`\`

Always explain what you are doing in the "text" field.`;

/**
 * sendMessage — sends a conversation to the AI proxy and returns the reply.
 * Handles parsing of json_action if present.
 */
export async function sendMessage(messages: AIMessage[]): Promise<AIResponse> {
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
  const langPrompt =
    currentLang === 'am'
      ? '\n\nUser preference: AMHARIC. Please respond in Amharic.'
      : '\n\nUser preference: ENGLISH. Please respond in English.';

  try {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages, system: SYSTEM_PROMPT + langPrompt }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Proxy responded ${res.status}`);
    }

    const data = await res.json();
    const rawText = data.content?.[0]?.text || '';

    // Check for json_action
    const jsonMatch = rawText.match(/```json_action\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const actionData = JSON.parse(jsonMatch[1]);
        
        // Handle the action via Dispatcher
        if (actionData.action) {
          useAgentStore.getState().showActionCard(
            actionData.action.type, 
            actionData.action.data
          );
        }
        
        return actionData;
      } catch (e) {
        console.error('Failed to parse AI action JSON:', e);
        return { text: rawText.replace(/```json_action[\s\S]*?```/, '').trim() };
      }
    }

    return { text: rawText };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[CityLink AI] Proxy failed:', msg);
    return { text: `[System] I'm having trouble connecting to my central brain. (Error: ${msg})` };
  }
}
