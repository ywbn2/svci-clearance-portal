import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bnpbcoergkrlfaatipkm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJucGJjb2VyZ2tybGZhYXRpcGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzkwMDcsImV4cCI6MjA4OTUxNTAwN30.NLJgIgOg-gODm5xFT849-atjelIfz92f76JAE2UxTu4';

export const supabase = createClient(supabaseUrl, supabaseKey);
