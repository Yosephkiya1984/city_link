import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Tool declarations (Gemini function-calling format) ────────────────────────
const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "get_wallet_balance",
        description: "Checks the user's current wallet balance."
      },
      {
        name: "process_p2p_transfer",
        description: "Transfers funds from the current user to another user by phone number.",
        parameters: {
          type: "object",
          properties: {
            recipient_phone: { type: "string", description: "Phone number of the recipient" },
            amount: { type: "number", description: "Amount to transfer in ETB" },
            note: { type: "string", description: "Optional note for the transfer" }
          },
          required: ["recipient_phone", "amount"]
        }
      },
      {
        name: "pay_utility_bill",
        description: "Pays a utility bill (Water, Electric, etc) using the wallet.",
        parameters: {
          type: "object",
          properties: {
            bill_type: { type: "string", description: "Type of bill (e.g., 'water', 'electric')" },
            account_no: { type: "string", description: "Bill account number" },
            amount: { type: "number", description: "Amount to pay in ETB" }
          },
          required: ["bill_type", "account_no", "amount"]
        }
      },
      {
        name: "start_parking_session",
        description: "Starts a new parking session at a specific lot.",
        parameters: {
          type: "object",
          properties: {
            lot_id: { type: "string", description: "The ID of the parking lot" },
            plate_number: { type: "string", description: "Vehicle plate number" }
          },
          required: ["lot_id", "plate_number"]
        }
      },
      {
        name: "reveal_delivery_pin",
        description: "Reveals the 6-digit delivery PIN for an active order.",
        parameters: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "The ID of the order" },
            order_type: { type: "string", enum: ["marketplace", "food"], description: "Type of order" }
          },
          required: ["order_id", "order_type"]
        }
      },

      {
        name: "check_order_status",
        description: "Checks the status of a specific order.",
        parameters: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "The ID of the order" }
          },
          required: ["order_id"]
        }
      },
      {
        name: "pay_traffic_fine",
        description: "Pays a traffic fine using the user's wallet.",
        parameters: {
          type: "object",
          properties: {
            fine_id: { type: "string", description: "The UUID of the traffic fine" }
          },
          required: ["fine_id"]
        }
      },
      {
        name: "verify_fayda_id",
        description: "Verifies a user's Fayda ID (National ID).",
        parameters: {
          type: "object",
          properties: {
            fayda_id: { type: "string", description: "The 12-digit Fayda Identification Number" }
          },
          required: ["fayda_id"]
        }
      },
      {
        name: "get_wallet_summary",
        description: "Provides a summary of spending, earnings, and transaction count for the current month.",
        parameters: {
          type: "object",
          properties: {
            days: { type: "number", description: "Number of days to analyze (default 30)" }
          }
        }
      },
      {
        name: "find_nearby_parking",
        description: "Finds available parking lots nearby or in a specific area (e.g., 'Bole').",
        parameters: { 
          type: "object", 
          properties: {
            location: { type: "string", description: "Specific area to search in (optional)" }
          }
        }
      },
      {
        name: "search_restaurant",
        description: "Searches for restaurants by name, category, or location.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query (e.g., 'Pizza', 'Habesha')" },
            location: { type: "string", description: "Area to search in (e.g., 'Kazanchis')" }
          }
        }
      },
      {
        name: "get_food_menu",
        description: "Fetches the full menu for a specific restaurant.",
        parameters: {
          type: "object",
          properties: {
            restaurant_id: { type: "string", description: "The UUID of the restaurant" }
          },
          required: ["restaurant_id"]
        }
      },
      {
        name: "search_listings",
        description: "Searches for products in the marketplace.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Product search terms" },
            category: { type: "string", description: "Category filter" },
            budget_max: { type: "number", description: "Maximum price filter" }
          }
        }
      },
      {
        name: "buy_marketplace_item",
        description: "Initiates the purchase or checkout process for a marketplace item.",
        parameters: {
          type: "object",
          properties: {
            product_id: { type: "string", description: "The ID of the product to buy" }
          },
          required: ["product_id"]
        }
      },
      {
        name: "order_food_item",
        description: "Initiates a food order for a specific menu item from a restaurant.",
        parameters: {
          type: "object",
          properties: {
            restaurant_id: { type: "string", description: "The ID of the restaurant" },
            menu_item_id: { type: "string", description: "The ID of the menu item" }
          },
          required: ["restaurant_id", "menu_item_id"]
        }
      },
      {
        name: "contribute_to_ekub",
        description: "Makes a contribution to a specific Ekub circle.",
        parameters: {
          type: "object",
          properties: {
            ekub_id: { type: "string", description: "The ID of the Ekub circle" },
            round_number: { type: "number", description: "The current round number" }
          },
          required: ["ekub_id", "round_number"]
        }
      },
      {
        name: "vouch_for_ekub_payout",
        description: "Vouches for or against an Ekub payout to a winner.",
        parameters: {
          type: "object",
          properties: {
            draw_id: { type: "string", description: "The ID of the draw" },
            ekub_id: { type: "string", description: "The ID of the Ekub circle" },
            approved: { type: "boolean", description: "Whether you approve the payout" },
            reason: { type: "string", description: "Optional reason for your decision" }
          },
          required: ["draw_id", "ekub_id", "approved"]
        }
      },
      {
        name: "get_merchant_summary",
        description: "Fetches performance metrics and summaries for a merchant."
      },
      {
        name: "ship_marketplace_order",
        description: "Marks a marketplace order as shipped/dispatched.",
        parameters: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "The ID of the order to ship" }
          },
          required: ["order_id"]
        }
      },
      {
        name: "fire_order_to_kitchen",
        description: "Sends a food order to the kitchen to start preparation.",
        parameters: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "The ID of the food order" }
          },
          required: ["order_id"]
        }
      },
      {
        name: "set_table_status",
        description: "Updates the availability status of a restaurant table.",
        parameters: {
          type: "object",
          properties: {
            table_id: { type: "string", description: "The ID of the table" },
            status: { type: "string", enum: ["available", "occupied", "reserved", "dirty"], description: "New status" }
          },
          required: ["table_id", "status"]
        }
      },
      {
        name: "log_new_pattern",
        description: "Captures a new user intent, question, or pattern for the platform's learning engine. Call this when you identify a gap in your knowledge or a recurring user need.",
        parameters: {
          type: "object",
          properties: {
            intent: { type: "string", description: "The core intent or topic (e.g., 'parking_booking_limit')" },
            example_phrase: { type: "string", description: "The specific way the user asked (in their language)" },
            language: { type: "string", enum: ["en", "am"], description: "Language code" }
          },
          required: ["intent", "example_phrase", "language"]
        }
      },
      {
        name: "search_nearby_osm",
        description: "Searches OpenStreetMap for specific points of interest (POI) like banks, gas stations, hospitals, or specific landmarks in Addis Ababa.",
        parameters: {
          type: "object",
          properties: {
            poi_type: { type: "string", description: "Type of place (e.g., 'bank', 'hospital', 'fuel', 'restaurant')" },
            location: { type: "string", description: "Area name or landmark to search around (e.g., 'Bole', 'Piazza')" }
          },
          required: ["poi_type"]
        }
      }
    ]
  }
];

// ── Local Ollama ──────────────────────────────────────────────────────────────
async function fetchLocalAI(messages: any[], system: string, localAiUrl: string) {
  if (!localAiUrl) return { error: "LOCAL_AI_URL_NOT_SET" };
  try {
    console.log(`[LOG] Connecting to local node: ${localAiUrl}...`);

    // Quick health check with 5s timeout — fail fast if tunnel is down
    const tagsController = new AbortController();
    const tagsTimeout = setTimeout(() => tagsController.abort(), 5000);

    let tagsRes: Response;
    try {
      tagsRes = await fetch(`${localAiUrl}/api/tags`, {
        signal: tagsController.signal,
        headers: {
          'User-Agent': 'CityLink-Agent/1.0',
          'ngrok-skip-browser-warning': 'true',
          'Bypass-Tunnel-Reminder': 'true',
          'bypass-tunnel-reminder': 'true',
          'X-Tunnel-Skip-2FA': 'true'
        }
      });
    } catch (e: any) {
      console.error(`[ERR] Local AI fetch failed: ${e.message}`);
      return { error: `LOCAL_TUNNEL_UNREACHABLE` };
    } finally {
      clearTimeout(tagsTimeout);
    }

    if (!tagsRes.ok) {
      console.error(`[ERR] Local node status ${tagsRes.status} (URL: ${localAiUrl}/api/tags)`);
      return { error: `LOCAL_STATUS_${tagsRes.status}_FAILED` };
    }

    const contentType = tagsRes.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await tagsRes.text();
      console.error(`[ERR] Local node returned non-JSON (${contentType}). Sample: ${text.substring(0, 100)}`);
      return { error: `LOCAL_RESPONSE_NOT_JSON` };
    }

    const tagsData = await tagsRes.json();
    if (!tagsData.models || tagsData.models.length === 0) {
      return { error: `NO_MODELS_INSTALLED` };
    }

    // 🧠 Smart model selection — prioritize FAST models to avoid Supabase 5s Edge Function timeout
    const MODEL_PRIORITY = [
      'qwen2.5:1.5b', 'qwen2.5:0.5b', 'qwen2.5:3b', 'qwen2.5:7b',
      'llama3.2:3b', 'llama3.1', 'llama3.3',
      'phi3', 'phi4',
      'deepseek',
    ];
    let selectedModel: string | undefined;
    for (const preferred of MODEL_PRIORITY) {
      const match = tagsData.models.find((m: any) =>
        m.name.toLowerCase().startsWith(preferred.toLowerCase())
      );
      if (match) { selectedModel = match.name; break; }
    }
    // Final fallback: largest by file size
    if (!selectedModel) {
      selectedModel = [...tagsData.models].sort((a: any, b: any) => b.size - a.size)[0].name;
    }
    console.log(`[LOG] Selected model: ${selectedModel} (from ${tagsData.models.length} installed)`);

// Append a concise action-format reminder so any model knows the expected output shape.
const actionReminder = `\n\nSYSTEM_OVERRIDE — HIGHEST PRIORITY:
You are the CityLink Sovereign Concierge. CRITICAL OUTPUT RULES:
1. Your ENTIRE response must be ONE raw JSON object. Start with { end with }. NO text before or after. NO markdown. NO backticks.
2. Format with action: {"text":"your reply","action":{"type":"tool_name","data":{params}}}
   Format no action: {"text":"your reply"}
3. REAL IDs for known entities:
   - Abebe restaurant_id: c6278c73-8008-4066-b157-b511d997f041
   - Beye menu_item_id: 1fd6e775-94aa-45cd-a7ed-7d02918eed99
   - Camera product_id: fd6743d9-427e-460a-8358-f937e6fd8438
   - Sami Parking lot_id: 80833d10-ed4f-4dc7-ac35-010e31ea2c8c
   - Eyeuu ekub_id: f0af7939-6ad7-4f71-b45e-04be4aa093b1 round_number: 1
4. ACT IMMEDIATELY for food/parking/market/ekub — never ask clarifying questions.
5. Use user's language: Amharic fidel for Amharic, plain English otherwise.`;

    const chatController = new AbortController();
    // Supabase Edge Functions have a longer timeout on higher tiers. We give the local node 120s to handle cold starts and slow CPU inference.
    const chatTimeout = setTimeout(() => chatController.abort(), 120000);

    try {
      const response = await fetch(`${localAiUrl}/api/chat`, {
        method: 'POST',
        signal: chatController.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CityLink-Agent/1.0',
          'ngrok-skip-browser-warning': 'true',
          'Bypass-Tunnel-Reminder': 'true',
          'bypass-tunnel-reminder': 'true'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: "system", content: system + actionReminder },
            ...messages.map((m: any) => ({ role: m.role, content: m.content }))
          ],
          stream: false,
          options: {
            num_predict: 256,
            temperature: 0.3,
            top_p: 0.9,
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawContent: string = data.message?.content || '';

        // ── Parse Local AI JSON Action ──────────────────────────────────────────
        // The local model is instructed to output raw JSON: {"text":"...","action":{...}}
        // We must extract this here in the Edge Function so the frontend receives
        // a structured { text, action } object (not a raw text blob).
        let parsedText = rawContent;
        let parsedAction: any = null;

        // Strategy 1: Try to find a ```json_action ... ``` fenced block
        const fencedMatch = rawContent.match(/```(?:json_action|json)[\s\S]*?({[\s\S]*?})[\s\S]*?```/);
        if (fencedMatch) {
          try {
            const parsed = JSON.parse(fencedMatch[1].trim());
            if (parsed.action) {
              parsedText = parsed.text || rawContent.replace(fencedMatch[0], '').trim();
              parsedAction = parsed.action;
            }
          } catch (_) { /* fall through */ }
        }

        // Strategy 2: Try the entire response as plain JSON (as instructed by actionReminder)
        if (!parsedAction) {
          try {
            const startIdx = rawContent.indexOf('{');
            const endIdx = rawContent.lastIndexOf('}');
            if (startIdx !== -1 && endIdx > startIdx) {
              let jsonStr = rawContent
                .slice(startIdx, endIdx + 1)
                .replace(/[\u201C\u201D]/g, '"')
                .replace(/[\u2018\u2019]/g, "'")
                .replace(/,\s*([\]}])/g, '$1');
              const parsed = JSON.parse(jsonStr);
              if (parsed.action && parsed.action.type) {
                parsedText = parsed.text || '';
                parsedAction = parsed.action;
              }
            }
          } catch (_) { /* fall through — return raw text */ }
        }

        console.log(`[LOG] Local AI parsed: action=${parsedAction?.type || 'none'}, text_len=${parsedText.length}`);
        return { 
          text: parsedText,
          ...(parsedAction ? { action: { name: parsedAction.type, args: parsedAction.data } } : {}),
          provider: `local-node-${selectedModel}` 
        };
      }
      const errText = await response.text();
      console.error(`[ERR] Local chat failed status ${response.status}: ${errText.substring(0, 100)}`);
      return { error: `LOCAL_CHAT_${response.status}` };
    } catch (e: any) {
      return { error: `LOCAL_CHAT_TIMEOUT` };
    } finally {
      clearTimeout(chatTimeout);
    }
  } catch (err: any) {
    console.error(`[ERR] fetchLocalAI Exception: ${err.message}`);
    return { error: `LOCAL_CONNECT_FAIL` };
  }
}

// ── Gemini Fallback ───────────────────────────────────────────────────────────
// Priority: gemini-2.0-flash → gemini-1.5-flash-latest → gemini-1.5-flash → gemini-pro
async function fetchGeminiFallback(payload: any, apiKey: string, strategyIndex = 0): Promise<any> {
  const strategies = [
    { version: 'v1beta', model: 'gemini-2.0-flash' },
    { version: 'v1beta', model: 'gemini-1.5-flash-latest' },
    { version: 'v1beta', model: 'gemini-1.5-flash' },
    { version: 'v1beta', model: 'gemini-pro' },
  ];

  if (strategyIndex >= strategies.length) {
    // ULTIMATE EMERGENCY: bare minimum call, no tools
    try {
      const lastMsg = payload.contents[payload.contents.length - 1].parts[0].text;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: lastMsg }] }] })
      });
      if (res.ok) {
        const data = await res.json();
        return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || '', provider: 'google-emergency' };
      }
      const errText = await res.text();
      return { error: `GEMINI_EMERGENCY_FAIL_${res.status}`, errText };
    } catch (e: any) {
      return { error: `GEMINI_EMERGENCY_ERR` };
    }
  }

  const { version, model } = strategies[strategyIndex];
  const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[GEMINI ERROR] ${model} returned ${res.status}: ${errText}`);
      // Always fallback to the next model on any error (including 429)
      return fetchGeminiFallback(payload, apiKey, strategyIndex + 1);
    }

    const data = await res.json();
    const part = data.candidates?.[0]?.content?.parts?.[0];
    if (!part) return fetchGeminiFallback(payload, apiKey, strategyIndex + 1);
    return {
      text: part.text,
      action: part.functionCall || part.function_call,
      provider: `google-${model}`
    };
  } catch (e: any) {
    console.error(`[GEMINI FETCH EXCEPTION]: ${e.message}`);
    return fetchGeminiFallback(payload, apiKey, strategyIndex + 1);
  }
}

// ── Main Handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { messages, system } = await req.json();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const localAiUrl = Deno.env.get('LOCAL_AI_URL') || 'https://citylink-ai.loca.lt';
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    console.log(`[LOG] Env Check: Gemini=${geminiApiKey ? 'SET' : 'MISSING'}, LocalAI=${localAiUrl ? 'SET' : 'MISSING'}`);

    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error('User not found');

    // ── AI Provider Selection (Sovereign-First) ─────────────────────────────
    let aiResult: any = null;
    // Build geminiPayload upfront so it is available to the tool-execution second-call
    // regardless of which provider was used for the first response.
    const geminiPayload = {
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      tools: TOOLS,
    };

    console.log(`[DIAG] Checking providers: LocalURL=${localAiUrl ? 'SET' : 'MISSING'}, GeminiKey=${geminiApiKey ? 'SET' : 'MISSING'}`);

    // 1. Try Local Ollama FIRST (Sovereign Primary)
    if (localAiUrl) {
      console.log(`[LOG] Attempting Local AI: ${localAiUrl}`);
      aiResult = await fetchLocalAI(messages, system, localAiUrl);
      if (aiResult.text || aiResult.action) {
        console.log(`[LOG] Sovereign success (model: ${aiResult.provider})`);
      } else {
        console.warn(`[LOG] Local AI failed or unreachable (${aiResult.error}). Falling back to Gemini...`);
        aiResult = null;
      }
    }

    // 2. Try Gemini Cloud (Reliable Fallback)
    if (!aiResult && geminiApiKey) {
      console.log(`[LOG] Calling Gemini Fallback (${geminiPayload.contents.length} messages)...`);
      aiResult = await fetchGeminiFallback(geminiPayload, geminiApiKey);
      
      if (aiResult.error && aiResult.retryable) {
        console.error(`[ERR] Gemini also failed: ${aiResult.error}`);
      }
    }

    // Check if we have any result at all
    if (!aiResult || (!aiResult.text && !aiResult.action)) {
      console.error(`[ERR] Total Infrastructure Failure: No response from Local or Cloud nodes.`);
      return new Response(JSON.stringify({
        error: 'SOVEREIGN_FAILURE',
        message: 'All AI providers are currently unreachable. Details: ' + (aiResult?.errText || aiResult?.error || 'Unknown'),
        retryable: true,
        version: "v105"
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // ── Tool Execution Loop (Gemini Only) ───────────────────────────────────────
    if (aiResult.action) {
      try {
        const { name, args } = aiResult.action;
        let toolResponse: any = null;
        
        const readOnlyTools = [
          "get_wallet_balance", 
          "get_wallet_summary",
          "search_restaurant", 
          "get_food_menu", 
          "find_nearby_parking", 
          "search_listings", 
          "check_order_status", 
          "get_merchant_summary"
        ];

        if (!readOnlyTools.includes(name)) {
          console.log(`[LOG] Action tool detected: ${name}. Deferring to frontend for confirmation.`);
          return new Response(JSON.stringify({ 
            text: aiResult.text || `I'll help you with that. Please confirm the ${name.replace(/_/g, ' ')} below.`, 
            action: aiResult.action,
            version: "v105" 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log(`[LOG] Executing read-only tool: ${name}`);
        if (name === "get_wallet_balance") {
          const { data, error } = await supabase.rpc('get_wallet_balance', { p_user_id: user.id });
          toolResponse = error ? { error: error.message } : { balance: data };
        } else if (name === "get_wallet_summary") {
          const { data: wallet } = await supabase.from('wallets').select('id').eq('user_id', user.id).single();
          if (wallet) {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - (args.days || 30));
            const { data, error } = await supabase
              .from('transactions')
              .select('category, amount, created_at, type')
              .eq('wallet_id', wallet.id)
              .eq('type', 'debit')
              .gte('created_at', startDate.toISOString());
            toolResponse = error ? { error: error.message } : data;
          } else {
            toolResponse = { error: "No wallet found" };
          }
        } else if (name === "find_nearby_parking") {
          const { data, error } = await supabase.from('parking_lots').select('*').limit(10);
          toolResponse = error ? { error: error.message } : data;
        } else if (name === "get_food_menu") {
          const { data, error } = await supabase.from('menu_items').select('*').eq('restaurant_id', args.restaurant_id);
          toolResponse = error ? { error: error.message } : data;
        } else if (name === "search_restaurant") {
          let rq = supabase.from('restaurants').select('*, menu_items(id, name, price)');
          if (args.query) rq = rq.or(`name.ilike.%${args.query}%,category.ilike.%${args.query}%`);
          const { data, error } = await rq.limit(5);
          toolResponse = error ? { error: error.message } : data;
        } else if (name === "search_listings") {
          let query = supabase.from('products').select('*');
          if (args.query) query = query.ilike('name', `%${args.query}%`);
          if (args.category) query = query.eq('category', args.category);
          if (args.budget_max) query = query.lte('price', args.budget_max);
          const { data, error } = await query.limit(10);
          toolResponse = error ? { error: error.message } : data;
        } else if (name === "check_order_status") {
          const [marketRes, foodRes] = await Promise.all([
            supabase.from('marketplace_orders').select('*').eq('id', args.order_id).single(),
            supabase.from('food_orders').select('*').eq('id', args.order_id).single()
          ]);
          toolResponse = marketRes.data || foodRes.data || { error: "Order not found" };
        } else if (name === "get_merchant_summary") {
          const { data, error } = await supabase.rpc('get_merchant_metrics', { p_merchant_id: user.id });
          toolResponse = error ? { error: error.message } : data;
        } else if (name === "log_new_pattern") {
          const { error } = await supabase.from('ai_knowledge_buffer').insert({
            intent: args.intent,
            example_phrase: args.example_phrase,
            language: args.language || 'en',
            user_id: user.id,
            status: 'pending_review'
          });
          toolResponse = error ? { ok: false, error: error.message } : { ok: true, message: "Pattern captured for learning engine." };
        } else if (name === "search_nearby_osm") {
          const area = args.location ? `${args.location}, Addis Ababa, Ethiopia` : 'Addis Ababa, Ethiopia';
          const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(args.poi_type + ' in ' + area)}&limit=5`;
          try {
            const res = await fetch(osmUrl, { headers: { 'User-Agent': 'CityLink-App/1.0' } });
            toolResponse = await res.json();
          } catch (e: any) {
            toolResponse = { error: "OSM lookup failed" };
          }
        }

        const secondPayload = {
          ...geminiPayload,
          contents: [
            ...geminiPayload.contents,
            { role: "model", parts: [{ functionCall: aiResult.action }] },
            { 
              role: "function", 
              parts: [{ 
                functionResponse: {
                  name: name,
                  response: { content: toolResponse }
                }
              }] 
            }
          ]
        };
        console.log(`[LOG] Calling Gemini with tool result for ${name}...`);
        aiResult = await fetchGeminiFallback(secondPayload, geminiApiKey!);
      } catch (err: any) {
        console.error(`[ERR] Tool execution failed: ${err.message}`);
        aiResult = { text: "I encountered an error while processing that request. Please try again." };
      }
    }

    if (aiResult.text) {
      console.log(`[LOG] Returning success (provider=${aiResult.provider})`);
      return new Response(JSON.stringify({ ...aiResult, version: "v105" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.error(`[ERR] No result from any provider. Last error: ${aiResult?.error || 'Unknown'}`);
    return new Response(JSON.stringify({
      error: 'SOVEREIGN_FAILURE',
      message: 'Provider down',
      retryable: true
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error: any) {
    const isAuth = error.message?.includes('Unauthorized') || error.message?.includes('User not found');
    console.error(`[ERR] Edge Function Exception: ${error.message}`);
    
    return new Response(JSON.stringify({
      error: isAuth ? 'AUTH_EXPIRED' : 'SYSTEM_EXCEPTION',
      message: error.message,
      retryable: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }
})
