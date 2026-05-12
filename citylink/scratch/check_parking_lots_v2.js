const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://azbtlshtoeytikiysmyr.supabase.co',
  process.env.SUPABASE_ANON_KEY || ''
);

async function checkParkingLots() {
  console.log('Fetching parking lots (NEW QUERY)...');
  const { data, error } = await supabase
    .from('parking_lots_dynamic')
    .select('*, parking_spots(*)');

  if (error) {
    console.error('Error fetching parking lots:', error);
  } else {
    console.log('Success! Found', data.length, 'lots');
    if (data.length > 0) {
        console.log('Sample lot:', data[0].name);
    }
  }
}

checkParkingLots();
