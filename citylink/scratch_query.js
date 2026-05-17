const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://azbtlshtoeytikiysmyr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6YnRsc2h0b2V5dGlraXlzbXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjIwNzMsImV4cCI6MjA4OTMzODA3M30.E_BR1IuVfKOdeJeuFTPaKVJjFlrs4zKypJWbTal1-P0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔑 Signing in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'testxyz123@citylink.local',
    password: 'password123',
  });

  if (authError) {
    console.error('❌ Sign in failed:', authError.message);
    return;
  }
  
  const user = authData.user;
  console.log(`✅ Signed in as ${user.email} (ID: ${user.id})`);

  console.log('\n--- FETCHING USER WALLET ---');
  const { data: wallet, error: walletErr } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (walletErr) {
    console.error('❌ Wallet fetch error:', walletErr);
  } else {
    console.log('✅ Wallet:', wallet);
  }

  console.log('\n--- FETCHING USER RESERVATIONS ---');
  const { data: resData, error: resError } = await supabase
    .from('reservations')
    .select('*, merchant:profiles!reservations_merchant_id_fkey(full_name), items:reservation_items(*, product:menu_items(name))')
    .eq('citizen_id', user.id);

  if (resError) {
    console.error('❌ Reservations fetch error:', resError);
  } else {
    console.log('✅ Reservations:', JSON.stringify(resData, null, 2));
  }

  console.log('\n--- FETCHING USER ESCROWS ---');
  const { data: escrowsData, error: escrowsError } = await supabase
    .from('escrows')
    .select('*');

  if (escrowsError) {
    console.error('❌ Escrows fetch error:', escrowsError);
  } else {
    console.log('✅ Escrows:', JSON.stringify(escrowsData, null, 2));
  }

  console.log('\n--- FETCHING WALLET TRANSACTIONS ---');
  if (wallet) {
    const { data: txs, error: txsErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false });

    if (txsErr) {
      console.error('❌ Transactions fetch error:', txsErr);
    } else {
      console.log('✅ Transactions:', JSON.stringify(txs, null, 2));
    }
  }
}

main();
