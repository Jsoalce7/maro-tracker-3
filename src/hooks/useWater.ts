import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export interface WaterLog {
    id: string;
    user_id: string;
    date: string;
    amount_ml: number;
    created_at: string;
}

export function useWater(date: string) {
    const queryClient = useQueryClient();
    const { session } = useAuthStore();
    const user = session?.user;

    // Fetch water logs for the date
    const { data: waterLogs, isLoading } = useQuery({
        queryKey: ['waterLogs', date],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('water_logs')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', date);

            if (error) throw error;
            return data as WaterLog[];
        },
        enabled: !!user,
    });

    const totalWaterMl = waterLogs?.reduce((sum, log) => sum + log.amount_ml, 0) || 0;

    // Add Water
    const { mutate: addWater } = useMutation({
        mutationFn: async (amountMl: number) => {
            if (!user) throw new Error('No user');
            const { error } = await supabase
                .from('water_logs')
                .insert({
                    user_id: user.id,
                    date,
                    amount_ml: amountMl
                });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['waterLogs', date] });
            queryClient.invalidateQueries({ queryKey: ['dayLog', date] }); // In case we update dayLog totals
        }
    });

    // Delete Water
    const { mutate: deleteWater } = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('water_logs').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['waterLogs', date] });
        }
    });

    const resetWater = async () => {
        try {
            if (!user) throw new Error('No user');
            const { error } = await supabase
                .from('water_logs')
                .delete()
                .eq('user_id', user.id)
                .eq('date', date);

            if (error) throw error;

            // Invalidate query to refresh UI
            queryClient.invalidateQueries({ queryKey: ['waterLogs', date] });
            queryClient.invalidateQueries({ queryKey: ['dayLog', date] }); // In case we update dayLog totals
            return { error: null };
        } catch (err) {
            console.error('Error resetting water:', err);
            return { error: err };
        }
    };

    return {
        waterLogs,
        totalWaterMl,
        addWater,
        deleteWater,
        resetWater,
        isLoading
    };
}
