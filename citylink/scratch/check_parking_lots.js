const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://azbtlshtoeytikiysmyr.supabase.co',
  process.env.SUPABASE_ANON_KEY || ''
);

async function checkParkingLots() {
  console.log('Fetching parking lots...');
  const { data, error } = await supabase
    .from('parking_lots_dynamic')
    .select('*, parking_spots(*), merchant:profiles(latitude, longitude)');

  if (error) {
    console.error('Error fetching parking lots:', error);
    // Try without the join
    console.log('Retrying without profiles join...');
    const { data: data2, error: error2 } = await supabase
      .from('parking_lots_dynamic')
      .select('*, parking_spots(*)');
    
    if (error2) {
      console.error('Error fetching without join:', error2);
    } else {
      console.log('Success without join! Found', data2.length, 'lots');
    }
  } else {
    console.log('Success with join! Found', data.length, 'lots');
    console.log('First lot merchant:', data[0]?.merchant);
  }
}

checkParkingLots();
