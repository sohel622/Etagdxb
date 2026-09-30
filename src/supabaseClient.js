// Dedicated Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';

// Configuration: Replace with your live Supabase Project URL and Anon API Key
const supabaseUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_URL || import.meta.env.REACT_APP_SUPABASE_URL)) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL)) ||
  (typeof window !== 'undefined' && (window.SUPABASE_URL || window.REACT_APP_SUPABASE_URL)) ||
  'https://gxoajbncfpwhisehvbcf.supabase.co'; // <--- Place your live Supabase Project URL here

const supabaseAnonKey = 
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.REACT_APP_SUPABASE_ANON_KEY)) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)) ||
  (typeof window !== 'undefined' && (window.SUPABASE_ANON_KEY || window.REACT_APP_SUPABASE_ANON_KEY)) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4b2FqYm5jZnB3aGlzZWh2YmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Mjg2ODAsImV4cCI6MjEwNDUwNDY4MH0.Gbpsd3h-MgodjvugosWLomZL51KWbxMZWFazi6zbzsg'; // <--- Place your live Supabase Anon Key here

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Provide backward compatibility and global browser access
if (typeof window !== 'undefined') {
  window.supabase = supabase;
  window.supabaseClient = supabase;
}

export { supabaseUrl, supabaseAnonKey };
export default supabase;
