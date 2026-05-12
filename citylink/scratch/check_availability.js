const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://azbtlshtoeytikiysmyr.supabase.co',
  process.env.SUPABASE_ANON_KEY || ''
);

async function checkAvailability() {
  console.log('Fetching parking lots to check availability...');
  const { data, error } = await supabase
    .from('parking_lots_dynamic')
    .select('*, parking_spots(*)');

  if (error) {
    console.error('Error:', error);
  } else {
    data.forEach(lot => {
      const occupied = Number(lot.occupied_count || 0);
      const total = Number(lot.total_spots || 0);
      const spotsInDb = lot.parking_spots?.length || 0;
      
      console.log(`Lot: ${lot.name}`);
      console.log(` - Total: ${total}, Occupied: ${occupied}, Spots in DB: ${spotsInDb}`);
      
      if (spotsInDb === 0 && total > 0) {
          const available = total - occupied;
          console.log(` - VIRTUAL available: ${available}`);
      } else if (spotsInDb > 0) {
          const available = lot.parking_spots.filter(s => s.status === 'available').length;
          console.log(` - DB available: ${available}`);
      } else {
          console.log(' - NO CAPACITY DEFINED');
      }
    });
  }
}

checkAvailability();
