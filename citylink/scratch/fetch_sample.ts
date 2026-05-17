import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://azbtlshtoeytikiysmyr.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6YnRsc2h0b2V5dGlraXlzbXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjIwNzMsImV4cCI6MjA4OTMzODA3M30.E_BR1IuVfKOdeJeuFTPaKVJjFlrs4zKypJWbTal1-P0');

async function run() {
  const { data, error } = await supabase.from('marketplace_orders').select('*').limit(1);
  if (error) console.error(error);
  console.log(JSON.stringify(data, null, 2));
}

run();
