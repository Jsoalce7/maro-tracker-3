import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { UserProfile, UserTargets } from '../types';
import { useAuthStore } from '../stores/authStore';
import { generateUserTargets } from '../lib/calculations';

export function useProfile() {
    const { session } = useAuthStore();
    const queryClient = useQueryClient();
    const userId = session?.user?.id;

    // Fetch Profile
    const profileQuery = useQuery({
        queryKey: ['profile', userId],
        queryFn: async () => {
            if (!userId) return null;
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) throw error;
            return data as UserProfile | null;
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes - prevents refetch on tab switches
    });

    // Fetch Targets
    const targetsQuery = useQuery({
        queryKey: ['targets', userId],
        queryFn: async () => {
            if (!userId) return null;
            const { data, error } = await supabase
                .from('user_targets')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) throw error;
            return data as UserTargets | null;
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes - prevents refetch on tab switches
    });

    // Create/Update Profile & Recalculate Targets
    const updateProfileMutation = useMutation({
        mutationFn: async (profile: Partial<UserProfile>) => {
            if (!userId) throw new Error('No user');

            // 1. Upsert Profile
            const { data: updatedProfile, error: profileError } = await supabase
                .from('user_profiles')
                .upsert({ id: userId, ...profile })
                .select()
                .single();

            if (profileError) throw profileError;

            // 2. Calculate new targets based on updated profile
            // We need the full profile to calculate, so merge current with update
            const fullProfile = { ...(profileQuery.data || {}), ...updatedProfile } as UserProfile;
            const newTargetsData = generateUserTargets(fullProfile);

            // 3. Upsert Targets
            const { error: targetsError } = await supabase
                .from('user_targets')
                .upsert({
                    user_id: userId,
                    ...newTargetsData
                });

            if (targetsError) throw targetsError;

            return updatedProfile;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['targets'] });
        },
    });

    return {
        profile: profileQuery.data,
        targets: targetsQuery.data,
        isLoading: profileQuery.isLoading || targetsQuery.isLoading,
        updateProfile: updateProfileMutation.mutate,
        isUpdating: updateProfileMutation.isPending,
    };
}
