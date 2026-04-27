import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CHAPA_SECRET_KEY = Deno.env.get('CHAPA_SECRET_KEY') || 'CHASECK_TEST-x9IW48kCEhmtsU4SESpwynbWJp9hrrQG';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://azbtlshtoeytikiysmyr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. INITIALIZE PAYMENT
    if (req.method === 'POST' && path === 'initialize') {
      const body = await req.json();
      const { amount, currency, email, phone_number, first_name, last_name, tx_ref, callback_url, return_url, customization, meta } = body;

      console.log(`[Initialize] Amount: ${amount}, TxRef: ${tx_ref}, User: ${meta?.user_id}`);

      const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          currency,
          email,
          phone_number,
          first_name,
          last_name,
          tx_ref,
          callback_url,
          return_url,
          customization,
          meta
        })
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status
      });
    }

    // 2. VERIFY PAYMENT (Client-side polling fallback)
    if (req.method === 'GET' && url.pathname.includes('/verify/')) {
      const txRef = url.pathname.split('/').pop();
      
      const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${txRef}`, {
        headers: {
          'Authorization': `Bearer ${CHAPA_SECRET_KEY}`
        }
      });

      const data = await response.json();

      // Authoritative credit if successful
      if (data.status === 'success' && data.data?.status === 'success') {
        const userId = data.data.meta?.user_id || req.headers.get('x-user-id'); // Need to ensure user_id is passed in meta or header
        
        if (userId) {
          const { error: rpcError } = await supabaseClient.rpc('process_wallet_topup', {
            p_user_id: userId,
            p_amount: data.data.amount,
            p_tx_ref: txRef
          });
          
          if (rpcError) console.error('RPC Error:', rpcError);
        }
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status
      });
    }

    // 3. WEBHOOK / CALLBACK (The "Golden Path")
    if (path === 'webhook') {
      let tx_ref, amount, userId, status;

      if (req.method === 'POST') {
        const body = await req.json();
        status = body.status;
        tx_ref = body.tx_ref;
        amount = body.amount;
        userId = body.meta?.user_id;
      } else if (req.method === 'GET') {
        status = url.searchParams.get('status') || url.searchParams.get('trx_status');
        tx_ref = url.searchParams.get('tx_ref') || url.searchParams.get('trx_ref');
        // GET callbacks usually don't have amount/meta, so we might need to verify
      }

      if (status === 'success' && tx_ref) {
        // If we don't have amount/userId (GET case), we must verify first
        if (!amount || !userId) {
          const vRes = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
            headers: { 'Authorization': `Bearer ${CHAPA_SECRET_KEY}` }
          });
          const vData = await vRes.json();
          if (vData.status === 'success' && vData.data?.status === 'success') {
            amount = vData.data.amount;
            userId = vData.data.meta?.user_id;
          }
        }

        if (userId && amount) {
          const { error: rpcError } = await supabaseClient.rpc('process_wallet_topup', {
            p_user_id: userId,
            p_amount: amount,
            p_tx_ref: tx_ref
          });
          if (rpcError) console.error('Webhook RPC Error:', rpcError);
        }
      }
      
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    // 4. SUCCESS REDIRECT (To get back to app from browser)
    if (req.method === 'GET' && path === 'success') {
      const redirectUrl = url.searchParams.get('redirect') || 'citylink://payment-success';
      
      return new Response(
        `<html>
          <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;">
            <h2 style="color:#10b981;">Payment Successful!</h2>
            <p>Your wallet is being updated. You can now return to the app.</p>
            <a href="${redirectUrl}" style="padding:12px 24px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:20px;">Back to CityLink</a>
            <script>
              setTimeout(() => { window.location.href = '${redirectUrl}'; }, 2000);
            </script>
          </body>
        </html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    return new Response('Not Found', { status: 404 });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
