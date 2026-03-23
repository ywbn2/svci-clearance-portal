import { createClient } from '@supabase/supabase-js';

const url = 'https://bnpbcoergkrlfaatipkm.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJucGJjb2VyZ2tybGZhYXRpcGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzkwMDcsImV4cCI6MjA4OTUxNTAwN30.NLJgIgOg-gODm5xFT849-atjelIfz92f76JAE2UxTu4';

const supabase = createClient(url, key);

async function updateAdmin() {
  const { error } = await supabase
    .from('admin_users')
    .update({ email: 'admin', password: '123123' })
    .eq('id', 'ADM-001');

  if (error) {
    console.error('Failed to update admin:', error.message);
  } else {
    console.log('Successfully updated the Admin account!');
  }
}

updateAdmin();
