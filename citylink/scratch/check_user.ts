import { getClient, supaQuery } from './src/services/supabase';

async function checkUser() {
  const {
    data: { user },
  } = await getClient().auth.getUser();
  console.log('Current User Auth ID:', user?.id);
  console.log('Current User Phone:', user?.phone);

  const { data: profile } = await supaQuery((c) =>
    c.from('profiles').select('*').eq('id', user?.id).single()
  );
  console.log('Profile:', JSON.stringify(profile, null, 2));
}

checkUser();
