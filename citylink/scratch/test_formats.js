
const { createClient } = require('@supabase/supabase-js');

const url = 'https://azbtlshtoeytikiysmyr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6YnRsc2h0b2V5dGlraXlzbXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjIwNzMsImV4cCI6MjA4OTMzODA3M30.E_BR1IuVfKOdeJeuFTPaKVJjFlrs4zKypJWbTal1-P0';

const client = createClient(url, key);

const base = '900001111';
const variants = [
  `+251${base}`,
  `0${base}`,
  `${base}`,
  `251${base}`
];

async function test() {
  for (const n of variants) {
    console.log(`Testing format ${n}...`);
    const { error } = await client.auth.signInWithOtp({ phone: n, channel: 'sms' });
    if (error) {
      console.log(`❌ ${n}: ${error.message}`);
    } else {
      console.log(`✅ ${n}: Success!`);
    }
  }
}

test();
