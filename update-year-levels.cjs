const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xeykcvsihomtdrhtrrcg.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addYearLevels() {
  console.log("Checking app_settings table for year_levels column...");
  
  // First, we need to try updating year_levels. If it fails, the column doesn't exist.
  const { error } = await supabase.from('app_settings').update({ year_levels: ['1st Year', '2nd Year', '3rd Year', '4th Year'] }).eq('id', 1);
  if (error) {
    if (error.code === 'PGRST204' || error.message.includes("could not find the 'year_levels' column")) {
      console.log('Needs column added (Run in SQL editor).');
      // I can write a SQL file to the brain fold so I can copy it and instruct the user or I can use Postgres functions if any are exposed.
    } else {
      console.error(error);
    }
  } else {
    console.log("Successfully initialized year_levels in the DB!");
  }
}

addYearLevels();
