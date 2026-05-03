
const { createClient } = require('@supabase/supabase-js');

const url = 'https://azbtlshtoeytikiysmyr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6YnRsc2h0b2V5dGlraXlzbXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjIwNzMsImV4cCI6MjA4OTMzODA3M30.E_BR1IuVfKOdeJeuFTPaKVJjFlrs4zKypJWbTal1-P0';

const client = createClient(url, key);

async function test() {
  console.log(`Searching for profiles with '900001111'...`);
  const { data, error } = await client.from('profiles').select('*').ilike('phone', '%900001111%');
  if (error) {
    console.log(`❌ Error: ${error.message}`);
  } else if (data && data.length > 0) {
    data.forEach(p => {
      console.log(`✅ Found: ${p.phone} (ID: ${p.id})`);
    });
  } else {
    console.log(`❓ No matching profiles found.`);
  }
}

test();
