import { createClient } from '@supabase/supabase-js';

// Use proxy path to bypass CORS/Cloudflare restrictions
// Get origin - on Vercel this will be the deployment URL
const origin = typeof window !== 'undefined' ? window.location.origin : '';

// Use direct Supabase URL in production, proxy in development
const isDevelopment = origin.includes('localhost') || origin.includes('127.0.0.1');
const supabaseUrl = isDevelopment 
  ? `${ origin }/_supaproxy`
  : 'https://nwdepfzbbfatbqzgsjnn.supabase.co';

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

// The remoteUrl check is no longer needed as supabaseUrl is determined dynamically
// and supabaseAnonKey has a fallback.
// if (!remoteUrl || !supabaseAnonKey) {
//     throw new Error('Missing Supabase environment variables');
// }

const cfClientId = import.meta.env.VITE_CF_CLIENT_ID;
const cfClientSecret = import.meta.env.VITE_CF_CLIENT_SECRET;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: window.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
    global: {
        headers: {
            ...(cfClientId && cfClientSecret ? {
                'CF-Access-Client-Id': cfClientId,
                'CF-Access-Client-Secret': cfClientSecret,
            } : {}),
        },
    },
});
