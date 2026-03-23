import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const lines = fs.readFileSync('src/supabaseClient.js', 'utf8');
const urlMatch = lines.match(/supabaseUrl = '([^']+)'/);
const keyMatch = lines.match(/supabaseKey = '([^']+)'/);

if (!urlMatch || !keyMatch) {
  console.log("Could not extract Supabase credentials from src/supabaseClient.js");
  process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function patchDeans() {
  console.log('Fetching legacy Dean accounts...');
  const { data: sigs, error } = await supabase.from('signatories').select('*').eq('role', 'Dean');
  if (error) {
    console.error(error);
    return;
  }
  
  if (sigs.length === 0) {
    console.log('No legacy Dean accounts found. Database is pristine.');
    return;
  }
  
  console.log(`Found ${sigs.length} legacy account(s). Patching to 'Dept. Dean'...`);
  
  const updates = sigs.map(sig => 
    supabase.from('signatories').update({ role: 'Dept. Dean' }).eq('id', sig.id)
  );
  
  await Promise.all(updates);
  console.log('Successfully modernized all legacy Dean roles to Dept. Dean in the database!');
}

patchDeans();
