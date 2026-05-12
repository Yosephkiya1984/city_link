const { createClient } = require('@supabase/supabase-js');

const url = 'https://azbtlshtoeytikiysmyr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6YnRsc2h0b2V5dGlraXlzbXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjIwNzMsImV4cCI6MjA4OTMzODA3M30.E_BR1IuVfKOdeJeuFTPaKVJjFlrs4zKypJWbTal1-P0';

const supabase = createClient(url, key);

async function testBooking() {
  console.log('Testing parking session...');
  
  // 1. Get a test user
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, role').limit(1);
  if (!profiles || profiles.length === 0) {
    console.error('No profile found');
    return;
  }
  const user = profiles[0];
  console.log('Test User:', user.full_name, user.id);

  // Give them some balance
  await supabase.from('wallets').update({ balance: 100 }).eq('user_id', user.id);
  console.log('Test User:', user.full_name, user.id);

  // 2. Get a test lot
  const { data: lots } = await supabase.from('parking_lots').select('id, name, merchant_id').limit(1);
  if (!lots || lots.length === 0) {
    console.error('No parking lots found');
    return;
  }
  const lot = lots[0];
  console.log('Test Lot:', lot.name, lot.id);

  // 3. Check wallet balance
  const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single();
  console.log('User Wallet Balance:', wallet?.balance);

  // 4. Call RPC
  const { data, error } = await supabase.rpc('start_parking_session_atomic', {
    p_user_id: user.id,
    p_lot_id: lot.id,
    p_spot_id: 'ZONE',
    p_plate: 'AA 2 A12345',
    p_duration_hrs: 2
  });

  console.log('Result Data:', data);
  console.log('Result Error:', error);
}

testBooking();
