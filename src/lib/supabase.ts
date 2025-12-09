import { createClient } from '@supabase/supabase-js';

// Get origin - on Vercel this will be the deployment URL
const origin = typeof window !== 'undefined' ? window.location.origin : '';

// Use direct Supabase URL in production, proxy in development
const isDevelopment = origin.includes('localhost') || origin.includes('127.0.0.1');
const supabaseUrl = isDevelopment
    ? `${origin}/_supaproxy`
    : 'https://nwdepfzbbfatbqzgsjnn.supabase.co';

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53ZGVwZnpiYmZhdGJxemdz.anbiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMjE0NjY2MCwiZXhwIjoyMDQ3NzIyNjYwfQ.HmvgqO-mTtFMfF6Xai3uAIL0bKNl0dB7D0XNJF2nzBk';

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
