import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if(key && rest.length) env[key.trim()] = rest.join('=').trim().replace(/['"]/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing connection to', supabaseUrl);

async function test() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/orders?select=id,order_number,delivery_date,status,customers(name),owner:users!orders_owner_id_fkey(full_name),order_items(id)&is=deleted_at.null&not.status=eq.completed&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    const text = await res.text();
    console.log('Response status:', res.status);
    console.log('Response body:', text);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

test();
