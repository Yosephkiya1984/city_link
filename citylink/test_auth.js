const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  'https://azbtlshtoeytikiysmyr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6YnRsc2h0b2V5dGlraXlzbXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjIwNzMsImV4cCI6MjA4OTMzODA3M30.E_BR1IuVfKOdeJeuFTPaKVJjFlrs4zKypJWbTal1-P0'
);
async function test() {
  const { data, error } = await client.auth.signUp({
    email: 'testxyz123@citylink.local',
    password: 'password123',
    phone: '+251999999991'
  });
  console.log('signUp:', data, error);
}
test();
