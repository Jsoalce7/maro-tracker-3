import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
    session: Session | null;
    isLoading: boolean;
    error: string | null;
    initialize: () => Promise<void>;
    signInAnonymously: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
    signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    isLoading: true,
    error: null,

    initialize: async () => {
        try {
            // Check initial session
            const { data: { session } } = await supabase.auth.getSession();
            set({ session, isLoading: false });

            // Listen for auth changes
            supabase.auth.onAuthStateChange((_event, session) => {
                set({ session });
            });
        } catch (error) {
            console.error('Auth initialization error:', error);
            set({ isLoading: false });
        }
    },

    signInAnonymously: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) throw error;
            set({ session: data.session, isLoading: false });
        } catch (error) {
            console.error('Sign in error:', error);
            set({ isLoading: false, error: 'Failed to sign in as guest' });
        }
    },

    signInWithEmail: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                set({ isLoading: false, error: error.message });
                return { error: error.message };
            }
            set({ session: data.session, isLoading: false });
            return { error: null };
        } catch (error: any) {
            const message = error?.message || 'Failed to sign in';
            set({ isLoading: false, error: message });
            return { error: message };
        }
    },

    signUpWithEmail: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) {
                set({ isLoading: false, error: error.message });
                return { error: error.message };
            }
            set({ session: data.session, isLoading: false });
            return { error: null };
        } catch (error: any) {
            const message = error?.message || 'Failed to sign up';
            set({ isLoading: false, error: message });
            return { error: message };
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, error: null });
    },

    clearError: () => set({ error: null }),
}));
