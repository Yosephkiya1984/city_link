
const { createClient } = require('@supabase/supabase-js');

const url = 'https://azbtlshtoeytikiysmyr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6YnRsc2h0b2V5dGlraXlzbXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjIwNzMsImV4cCI6MjA4OTMzODA3M30.E_BR1IuVfKOdeJeuFTPaKVJjFlrs4zKypJWbTal1-P0';

const client = createClient(url, key);

const numbers = ['904030403', '911178024'];

async function test() {
  for (const n of numbers) {
    console.log(`Searching for '${n}'...`);
    const { data, error } = await client.from('profiles').select('*').ilike('phone', `%${n}%`);
    if (data && data.length > 0) {
      data.forEach(p => console.log(`✅ Found: ${p.phone} (ID: ${p.id})`));
    } else {
      console.log(`❓ Not found.`);
    }
  }
}

test();
