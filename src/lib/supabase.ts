import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

const cfClientId = import.meta.env.VITE_CF_CLIENT_ID;
const cfClientSecret = import.meta.env.VITE_CF_CLIENT_SECRET;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
        headers: {
            ...(cfClientId && cfClientSecret ? {
                'CF-Access-Client-Id': cfClientId,
                'CF-Access-Client-Secret': cfClientSecret,
            } : {}),
        },
    },
});
