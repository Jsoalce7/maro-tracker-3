import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { WeightLog } from '../types';

interface WeightState {
    weights: WeightLog[];
    loading: boolean;
    error: string | null;
    fetchWeights: () => Promise<void>;
    addWeight: (date: string, weight_lb: number) => Promise<void>;
    getLatestWeight: () => number | null;
    get7DayAverage: (date: string) => number | null;
}

export const useWeightStore = create<WeightState>((set, get) => ({
    weights: [],
    loading: false,
    error: null,

    fetchWeights: async () => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('weight_logs')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;

            // Normalize dates to YYYY-MM-DD in case DB returns ISO/Time
            const normalizedWeights = (data as any[]).map(w => ({
                ...w,
                date: w.date.includes('T') ? w.date.split('T')[0] : w.date
            }));

            set({ weights: normalizedWeights as WeightLog[], loading: false });
        } catch (err: any) {
            // Only log if it's not a known network/cancellation error to reduce spam
            const message = err.message || 'Unknown error';
            if (message !== get().error) {
                console.error('Error fetching weights:', message);
            }
            set({ error: message, loading: false });
        }
    },

    addWeight: async (date: string, weight_lb: number) => {
        set({ loading: true, error: null });
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase
                .from('weight_logs')
                .upsert({
                    user_id: user.id,
                    date,
                    weight_lb,
                    source: 'manual',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, date' });

            if (error) throw error;
            await get().fetchWeights();
        } catch (err: any) {
            console.error('Error adding weight:', err);
            set({ error: err.message, loading: false });
        }
    },

    getLatestWeight: () => {
        const { weights } = get();
        if (weights.length === 0) return null;
        // Assuming weights are sorted descending by date from fetchWeights
        return weights[0].weight_lb;
    },

    get7DayAverage: (dateStr: string) => {
        const { weights } = get();
        const targetDate = new Date(dateStr);

        // Filter weights for [date - 6 days, date]
        const windowWeights = weights.filter(w => {
            const wDate = new Date(w.date);
            const diffTime = targetDate.getTime() - wDate.getTime();
            const diffDays = diffTime / (1000 * 3600 * 24);
            return diffDays >= 0 && diffDays < 7;
        });

        if (windowWeights.length === 0) return null;

        const sum = windowWeights.reduce((acc, curr) => acc + curr.weight_lb, 0);
        return Number((sum / windowWeights.length).toFixed(1));
    }
}));
