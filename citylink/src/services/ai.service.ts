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

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are CityLink AI, a helpful assistant for residents of Addis Ababa, Ethiopia.
You help citizens navigate city services: LRT (light rail), parking, food delivery, job search,
ekub savings circles, delala real estate, exchange rates, emergency services, and more.
Always be friendly, concise, and culturally aware. Mention Ethiopian context where relevant
(Birr currency, sub-cities, local businesses). Keep responses short and actionable.`;

/**
 * sendMessage — sends a conversation to the AI proxy and returns the reply.
 * Falls back to local canned answers if the proxy is not configured or fails.
 */
export async function sendMessage(messages: AIMessage[]): Promise<string> {
  const supaUrl = Config.supaUrl;
  const session = await getSession();

  if (!supaUrl || supaUrl.includes('REPLACE')) {
    return "I'm currently in offline mode. Please configure Supabase in your environment to talk to me.";
  }

  if (!session?.access_token) {
    return 'Please sign in to talk to the AI assistant.';
  }

  const proxyUrl = `${supaUrl}/functions/v1/ai-chat`;

  try {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages, system: SYSTEM_PROMPT }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Proxy responded ${res.status}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;

    if (text) return text;
    throw new Error('Empty response from AI proxy');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[CityLink AI] Proxy failed:', msg);
    return `[System] I'm having trouble connecting to my central brain right now. Please try again in a moment. (Error: ${msg})`;
  }
}
