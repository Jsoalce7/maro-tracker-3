import { createClient } from '@supabase/supabase-js';

// Use proxy path to bypass CORS/Cloudflare restrictions
// construct absolute URL because supabase-js requires valid http/https prefix
const isBrowser = typeof window !== 'undefined';
const origin = isBrowser ? window.location.origin : '';
const supabaseUrl = `${origin}/_supaproxy`;

// We still check for the env var to ensure configuration exists, but we use the proxy path in the client
const remoteUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!remoteUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
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
