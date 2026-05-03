/**
 * AI Service — CityLink assistant powered by Claude
 *
 * WHY A PROXY?
 * Anthropic API keys must never be embedded in a mobile app bundle — the
 * binary can be extracted and the key abused. All requests must go through
 * a thin server-side proxy that holds the key securely.
 */

import { Config } from '../config';
import { getSession } from './auth.service';
import { useSystemStore } from '../store/SystemStore';

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

const SYSTEM_PROMPT = `You are CityLink AI, a highly intelligent native AI assistant for residents of Addis Ababa, Ethiopia.
Your mission is to help citizens manage their lives, optimize their spending, and handle transactions efficiently.

CORE CAPABILITIES:
1.  **Amharic Support**: You provide perfect, culturally nuanced Amharic interaction.
2.  **Spending Optimization**: You can analyze transaction patterns and provide insights.
3.  **Auto Split**: You can suggest splitting recent group expenses (food, transport).
4.  **City Services**: Guide users through LRT, parking, ekub, delala, and marketplace.

INTERACTION RULES:
- Be friendly, concise, and professional.
- Use "Birr" or "ETB" for currency.
- ALWAYS check if the user's intent matches a system action.

TOOL CALLING (Output Format):
If you identify an opportunity for a system action, you MUST respond with a JSON object inside a code block tagged with \`json_action\`.
Example for spending insight:
\`\`\`json_action
{
  "text": "I've analyzed your spending. You spent 2,500 ETB on food this week.",
  "action": {
    "type": "SPENDING_INSIGHT",
    "data": { "category": "food", "amount": 2500, "period": "week" }
  }
}
\`\`\`

Example for split suggestion:
\`\`\`json_action
{
  "text": "Would you like to split your last transaction at Antica (450 ETB)?",
  "action": {
    "type": "SPLIT_SUGGESTION",
    "data": { "transaction_id": "last_tx", "amount": 450, "merchant": "Antica" }
  }
}
\`\`\`

Otherwise, respond with plain text.`;

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
