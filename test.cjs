const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const lines = fs.readFileSync('src/App.jsx', 'utf8');
const urlMatch = lines.match(/supabaseUrl = '([^']+)'/);
const keyMatch = lines.match(/supabaseAnonKey = '([^']+)'/);
const supabase = createClient(urlMatch[1], keyMatch[1]);
async function test() {
  const { data: sigs } = await supabase.from('signatories').select('*').order('id', {ascending: false}).limit(3);
  const { data: stds } = await supabase.from('students').select('*').order('id', {ascending: false}).limit(3);
  const { data: depts } = await supabase.from('departments').select('*');
  const { data: courses } = await supabase.from('courses').select('*');
  console.log('--- SIGS ---');
  console.log(sigs);
  console.log('--- STDS ---');
  console.log(stds);
  console.log('--- DEPTS ---');
  console.log(depts);
}
test();
