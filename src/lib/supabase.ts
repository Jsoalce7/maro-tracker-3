import { createClient } from '@supabase/supabase-js';

// Get origin - on Vercel this will be the deployment URL
const origin = typeof window !== 'undefined' ? window.location.origin : '';

// Use direct Supabase URL in production, proxy in development or tunnel
// We treat maro.revisioniai.com as development because it proxies to local Vite
const usesLocalProxy =
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('revisioniai.com') ||
    (origin.includes('vercel.app') && import.meta.env.VITE_SUPABASE_URL?.includes('revisioniai.com'));

let supabaseUrl = usesLocalProxy
    ? `${origin}/_supaproxy`
    : import.meta.env.VITE_SUPABASE_URL;

// Enforce HTTPS if not on localhost to prevent Mixed Content errors
if (supabaseUrl && !supabaseUrl.startsWith('http://localhost') && !supabaseUrl.startsWith('http://127.0.0.1') && supabaseUrl.startsWith('http://')) {
    supabaseUrl = supabaseUrl.replace('http://', 'https://');
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    if (!usesLocalProxy) {
        console.error('Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
    }
}

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
