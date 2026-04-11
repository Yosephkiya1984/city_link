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
  const supaUrl = Config.supaUrl;
  const anonKey = Config.supaKey;
  
  if (!supaUrl || !anonKey || supaUrl.includes('REPLACE')) {
    return "I'm currently in offline mode. Please configure Supabase in your environment to talk to me.";
  }

  const proxyUrl = `${supaUrl}/functions/v1/ai-chat`;

  try {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ messages, system: SYSTEM_PROMPT }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || `Proxy responded ${res.status}`);
    }
    
    const data = await res.json();
    const text = data.content?.[0]?.text;
    
    if (text) return text;
    throw new Error('Empty response from AI proxy');
  } catch (e) {
    console.warn('[CityLink AI] Proxy failed:', e.message);
    return `[System] I'm having trouble connecting to my central brain right now. Please try again in a moment. (Error: ${e.message})`;
  }
}

