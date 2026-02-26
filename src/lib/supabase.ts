import { createClient } from '@supabase/supabase-js';

// المتغيرات دي بتيجي من Vercel Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Missing Supabase Environment Variables. The app will not function correctly without a backend.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
