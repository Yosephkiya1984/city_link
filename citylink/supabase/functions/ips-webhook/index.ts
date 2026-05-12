import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * IPS Webhook Handler: The listener for EthioPay-IPS National Switch callbacks.
 * This function finalizes the handshake for parking reservations and wallet top-ups.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // 🛡️ ADDIS STANDARD SECURITY: Verify Shared Secret
    const authHeader = req.headers.get('Authorization');
    const webhookSecret = Deno.env.get('IPS_WEBHOOK_SECRET');
    
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.error('[IPS Webhook] Unauthorized attempt - Invalid Bearer Token');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await req.json();

    /**
     * Expected IPS Callback Payload Structure (Standardized for 2026):
     * {
     *   "tx_ref": "PARK-123-ABC",
     *   "status": "SUCCESS",
     *   "amount": 150.00,
     *   "currency": "ETB",
     *   "ips_reference": "IPS-SW-001-992",
     *   "payer_alias": "yoseph@ips",
     *   "meta": {
     *     "user_id": "...",
     *     "session_id": "..." (Optional for parking)
     *   }
     * }
     */

    const { tx_ref, status, amount, meta } = body;
    console.log(`[IPS Webhook] Processing ${tx_ref} - Status: ${status}`);

    if (status === 'SUCCESS') {
      // 1. Check if it's a Parking Session update
      if (tx_ref.startsWith('PARK-')) {
        const sessionId = meta?.session_id;
        
        if (sessionId) {
          const { data: session, error: sessionError } = await supabaseClient
            .from('parking_sessions')
            .update({ 
              status: 'RESERVED',
              payment_status: 'PAID',
              ips_reference: body.ips_reference,
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
            .select()
            .single();

          if (sessionError) throw sessionError;
          console.log(`[IPS Webhook] Parking session ${sessionId} confirmed.`);
        }
      }

      // 2. Generic Wallet Top-up logic (if not parking or in addition to)
      const userId = meta?.user_id;
      if (userId && !tx_ref.startsWith('PARK-')) {
        const { error: rpcError } = await supabaseClient.rpc('process_wallet_topup', {
          p_user_id: userId,
          p_amount: amount,
          p_tx_ref: tx_ref
        });
        
        if (rpcError) console.error('[IPS Webhook] RPC Topup Error:', rpcError);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('[IPS Webhook] Fatal Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
