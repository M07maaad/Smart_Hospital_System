import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase configuration is missing. Please check your .env or Vercel settings.');
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseKey || ''
);
