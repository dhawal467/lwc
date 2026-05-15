import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// simple parse of .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if(key && rest.length) env[key.trim()] = rest.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      delivery_date,
      status,
      customers ( name ),
      owner:users!orders_owner_id_fkey ( full_name ),
      order_items ( id )
    `)
    .is('deleted_at', null)
    .not('status', 'eq', 'completed')
    .limit(1);

  if (error) console.error('Error 1:', error);
  else console.log('Success 1!', data);
  
  // also let's try users!owner_id in case it changed
  const { data: d2, error: e2 } = await supabase
    .from('orders')
    .select(`
      id,
      owner:users!owner_id ( full_name )
    `)
    .limit(1);

  if (e2) console.error('Error 2:', e2);
  else console.log('Success 2!', d2);
}
test();
