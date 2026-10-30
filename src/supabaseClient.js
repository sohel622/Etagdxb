import { createClient as pkgCreateClient } from '@supabase/supabase-js';

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

const createClientFn = (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function')
  ? window.supabase.createClient
  : pkgCreateClient;

export const supabase = createClientFn(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Intercept profiles table queries to guarantee conflict resolution without 42P10 constraint errors
if (supabase && typeof supabase.from === 'function') {
  const originalFrom = supabase.from.bind(supabase);
  supabase.from = function(table) {
    const builder = originalFrom(table);
    if (table === 'profiles') {
      const originalUpsert = builder.upsert.bind(builder);
      builder.upsert = function(values, options) {
        const p = originalUpsert(values, options);
        const originalThen = p.then.bind(p);
        p.then = function(onFulfilled, onRejected) {
          return originalThen(
            async (res) => {
              if (res && res.error && res.error.message && res.error.message.includes('ON CONFLICT')) {
                console.warn("[supabaseClient] Intercepted ON CONFLICT error on profiles table, falling back to safe resolution:", res.error.message);
                const item = Array.isArray(values) ? values[0] : values;
                
                // 1. Try update by email if email present
                if (item && item.email) {
                  try {
                    const updateRes = await originalFrom('profiles').update(item).eq('email', item.email).select();
                    if (!updateRes.error && updateRes.data && updateRes.data.length > 0) {
                      return onFulfilled ? onFulfilled(updateRes) : updateRes;
                    }
                  } catch (_) {}
                }

                // 2. Try update by id if numeric
                if (item && /^\d+$/.test(String(item.id))) {
                  try {
                    const updateRes = await originalFrom('profiles').update(item).eq('id', Number(item.id)).select();
                    if (!updateRes.error && updateRes.data && updateRes.data.length > 0) {
                      return onFulfilled ? onFulfilled(updateRes) : updateRes;
                    }
                  } catch (_) {}
                }

                // 3. Try upsert without the onConflict parameter
                try {
                  const safeUpsert = await originalFrom('profiles').upsert(values);
                  if (!safeUpsert.error) {
                    return onFulfilled ? onFulfilled(safeUpsert) : safeUpsert;
                  }
                } catch (_) {}
              }
              return onFulfilled ? onFulfilled(res) : res;
            },
            onRejected
          );
        };
        return p;
      };
    }
    return builder;
  };
}

// Provide backward compatibility and global browser access
if (typeof window !== 'undefined') {
  window.supabase = supabase;
  window.supabaseClient = supabase;
}

export { supabaseUrl, supabaseAnonKey };
export default supabase;
