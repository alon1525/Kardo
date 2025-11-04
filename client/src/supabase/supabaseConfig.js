// Supabase configuration file
import { createClient } from '@supabase/supabase-js';

// Environment variables REQUIRED - set them in .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging
console.log('Supabase Config Check:');
console.log('URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
console.log('Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
  console.error('Please create a .env file in the client directory with these variables.');
  console.error('Get them from: https://supabase.com/dashboard > Your Project > Settings > API');
}

// Create client even if env vars are missing (to avoid crash, but it will fail on use)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Test connection on import (for debugging)
if (supabase) {
  console.log('Supabase client initialized');
} else {
  console.error('Supabase client NOT initialized - missing configuration');
}
