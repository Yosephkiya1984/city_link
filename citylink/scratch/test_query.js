
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://azbtlshtoeytikiysmyr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // I'll use service role to see everything first
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  const userId = '7a1b64f3-8826-4045-8c61-07909562c5b8';
  
  const { data: sessions, error: sessErr } = await supabase
    .from('parking_sessions')
    .select('*, parking_lots(name, rate_per_hour)')
    .eq('user_id', userId)
    .or('status.ilike.active,status.ilike.ACTIVE,status.ilike.RESERVED')
    .order('start_time', { ascending: false })
    .limit(1);

  console.log('Error:', sessErr);
  console.log('Sessions:', JSON.stringify(sessions, null, 2));
}

testQuery();
