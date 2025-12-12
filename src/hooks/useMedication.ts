import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicationService } from '../services/medicationService';
import { MedicationProfile, MedicationSchedule, MedicationLog, MedicationDose, MedicationDoseStatus, MedicationLogStatus, MedicationScheduleDefinition, ActiveIngredient } from '../types/medication';
import { useAuthStore } from '../stores/authStore';

export function useMedication(dateStr: string) {
    const { session } = useAuthStore();
    const userId = session?.user?.id;
    const queryClient = useQueryClient();

    // 1. Fetch Profiles
    const { data: profiles = [] } = useQuery({
        queryKey: ['medication_profiles', userId],
        queryFn: () => userId ? medicationService.getProfiles(userId) : Promise.resolve([]),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000
    });

    // 2. Fetch Schedules
    const { data: schedules = [] } = useQuery({
        queryKey: ['medication_schedules', userId],
        queryFn: () => userId ? medicationService.getActiveSchedules(userId) : Promise.resolve([]),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000
    });

    // 3. Fetch Logs for this date
    // DateStr is YYYY-MM-DD. 
    const { data: logs = [] } = useQuery({
        queryKey: ['medication_logs', userId, dateStr],
        queryFn: () => userId ? medicationService.getLogsForRange(userId, dateStr, dateStr) : Promise.resolve([]),
        enabled: !!userId
    });

    // 4. Fetch Custom Schedules (Phase 4)
    const { data: customSchedules = [] } = useQuery({
        queryKey: ['medication_custom_schedules', userId],
        queryFn: () => userId ? medicationService.getCustomSchedules(userId) : Promise.resolve([]),
        enabled: !!userId
    });

    // --- Core Logic: Merge Logic ---
    const doses: MedicationDose[] = useMemo(() => {
        if (!userId || !profiles.length) return [];

        const plan: MedicationDose[] = [];

        // Helper: Is Date matching Schedule?
        // dateStr is YYYY-MM-DD
        const [y, m, d] = dateStr.split('-').map(Number);
        const dayOfWeek = new Date(y, m - 1, d).getDay(); // 0-6

        // 1. "Take Daily" Medications
        // These don't have a specific time unless logged, OR unless we assume "Daily" means "Log it sometime".
        // Requirement: "Show ... as something the user should take that day"
        // If not scheduled, we can show it as "Any Time" or "Daily".
        const dailyMeds = profiles.filter(p => p.take_daily);

        dailyMeds.forEach(med => {
            // Check if already logged (to prevent dups if also scheduled? User said deduplicate)
            // Prioritize exact schedule time if exists.
            // Strategy: Generate a dose for it.
            // If this med is ALSO in a schedule that applies today, we might want to suppress the generic "Daily" one
            // and prefer the Scheduled one.
            // OR, show both if they take it twice?
            // "Deduplicate if a med is both daily and scheduled." -> Implies preference for Schedule.

            // Check if this med is covered by any ACTIVE schedule TODAY
            const coveredBySchedule = customSchedules.some((s: any) =>
                s.is_active &&
                s.medication_assignments?.some((ma: any) => ma.medication_id === med.id) &&
                (!s.days_of_week || s.days_of_week.includes(dayOfWeek))
            );

            if (!coveredBySchedule) {
                // Create a "Daily" dose (generic)
                // Check if logged
                const foundLog = logs.find(l => l.medication_id === med.id && !l.schedule_id); // No schedule_id link for generic

                plan.push({
                    id: foundLog ? foundLog.id : `daily_${med.id}_${dateStr}`,
                    medication: med,
                    status: foundLog ? foundLog.status : 'due',
                    is_logged: !!foundLog,
                    log_id: foundLog?.id,
                    taken_at: foundLog?.taken_at ? new Date(foundLog.taken_at) : undefined,
                    time_display: 'Daily', // Generic time
                    planned_time: foundLog?.taken_at ? new Date(foundLog.taken_at) : undefined, // No planned time
                    is_prn: false // It IS expected, just generic
                });
            }
        });

        // 2. Custom Schedules
        customSchedules.forEach((sche: any) => {
            if (!sche.is_active) return;

            // Check for Phase 5 granular entries
            if (sche.entries && sche.entries.length > 0) {
                // Filter entries for today
                const todaysEntries = sche.entries.filter((e: any) => e.day_of_week === dayOfWeek);

                todaysEntries.forEach((entry: any) => {
                    const med = profiles.find(p => p.id === entry.medication_id);
                    if (!med) return;

                    const scheduledTime = new Date(`${dateStr}T${entry.time}`);

                    // Log Matching for Granular: Try to match by planned_time ISO string
                    // This assumes the stored log has the exact ISO string of the planned time.
                    // If not found, we might need a fallback, but "first free log" is complex with multi-dose.
                    // Let's rely on strict matching for now as we control the creation.
                    const plannedTimeStr = scheduledTime.toISOString();
                    const foundLog = logs.find(l =>
                        l.schedule_id === sche.id &&
                        l.medication_id === med.id &&
                        l.planned_time === plannedTimeStr
                    );

                    plan.push({
                        id: foundLog ? foundLog.id : `sched_${sche.id}_${med.id}_${entry.time}`,
                        medication: med,
                        schedule: sche,
                        status: foundLog ? foundLog.status : 'due',
                        is_logged: !!foundLog,
                        log_id: foundLog?.id,
                        taken_at: foundLog?.taken_at ? new Date(foundLog.taken_at) : undefined,
                        planned_time: scheduledTime,
                        time_display: scheduledTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                        dose_override: entry.dose_override, // Phase 5
                        is_prn: false
                    });
                });

            } else {
                // Legacy / Phase 4 Simple Logic (fallback if no entries defined)
                if (sche.days_of_week && !sche.days_of_week.includes(dayOfWeek)) return;

                sche.medication_assignments?.forEach((assign: any) => {
                    const med = profiles.find(p => p.id === assign.medication_id);
                    if (!med) return;

                    const scheduledTime = new Date(`${dateStr}T${sche.time}`);
                    const foundLog = logs.find(l => l.schedule_id === sche.id && l.medication_id === med.id); // Simple matching logic

                    plan.push({
                        id: foundLog ? foundLog.id : `sched_${sche.id}_${med.id}_${dateStr}`,
                        medication: med,
                        schedule: sche,
                        status: foundLog ? foundLog.status : 'due',
                        is_logged: !!foundLog,
                        log_id: foundLog?.id,
                        taken_at: foundLog?.taken_at ? new Date(foundLog.taken_at) : undefined,
                        planned_time: scheduledTime,
                        time_display: scheduledTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                        is_prn: false
                    });
                });
            }
        });

        // 3. PRN (Logged but not expected)
        logs.filter(l => !l.schedule_id).forEach(log => {
            // If this log corresponds to a "Daily" med, we already handled it above (matched by med_id).
            // We need to differentiate "Daily Log" vs "PRN Log".
            // Logic above: `dailyMeds` looks for `!l.schedule_id`.
            // So if a med is "Take Daily", its log is consumed there.
            // If a med is NOT "Take Daily" and NOT in a schedule, it is PRN.
            const med = profiles.find(p => p.id === log.medication_id);
            if (!med) return;

            // Check if captured by Daily logic
            const isDaily = med.take_daily;
            // If it IS daily, but wasn't covered by schedule (so fell to generic daily), we matched it.
            // Wait, `plan` already has it if daily.
            // How do we ensure we don't duplicate?
            // Check if `plan` has this log_id.
            if (plan.some(d => d.log_id === log.id)) return;

            // Else it's PRN
            plan.push({
                id: log.id,
                medication: med,
                status: log.status,
                is_logged: true,
                log_id: log.id,
                taken_at: log.taken_at ? new Date(log.taken_at) : undefined,
                time_display: log.taken_at ? new Date(log.taken_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'PRN',
                is_prn: true
            });
        });

        // Sort
        return plan.sort((a, b) => {
            const tA = a.planned_time || a.taken_at || new Date(8640000000000000);
            const tB = b.planned_time || b.taken_at || new Date(8640000000000000);
            return tA.getTime() - tB.getTime();
        });
    }, [profiles, customSchedules, logs, dateStr, userId]);


    // --- Mutations ---
    const logDoseMutation = useMutation({
        mutationFn: async ({ medId, scheduleId, status, plannedTime }: { medId: string, scheduleId?: string, status: MedicationLogStatus, plannedTime?: Date }) => {
            if (!userId) throw new Error("No user");
            return medicationService.logDose(
                userId,
                medId,
                scheduleId,
                dateStr,
                status,
                plannedTime?.toISOString()
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medication_logs'] });
        }
    });

    const deleteLogMutation = useMutation({
        mutationFn: async (logId: string) => {
            return medicationService.deleteLog(logId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medication_logs'] });
        }
    });

    const addMedicationMutation = useMutation({
        mutationFn: async (input: {
            name: string,
            brand?: string,
            tags?: string[],
            medication_tags?: string[], // New
            active_ingredients?: ActiveIngredient[], // New
            strength_val?: number,
            strength_unit?: string,
            form?: string,
            notes?: string,
            current_stock?: number,
            low_stock_threshold?: number,
            take_daily?: boolean, // Phase 4
            schedules: any[] // Ignored or empty
        }) => {
            if (!userId) throw new Error("No user");

            // Transform simplistic input to full schema objects
            const profile: Partial<MedicationProfile> = {
                name: input.name,
                brand: input.brand,
                category_tags: input.tags,
                medication_tags: input.medication_tags,
                active_ingredients: input.active_ingredients,
                strength_value: input.strength_val,
                strength_unit: input.strength_unit,
                form: input.form,
                notes: input.notes,
                current_stock: input.current_stock,
                low_stock_threshold: input.low_stock_threshold,
                take_daily: input.take_daily || false, // Phase 4
                dose_quantity: input.strength_val && input.strength_unit ? `${input.strength_val} ${input.strength_unit}` : '1 dose' // Default visual
            };

            const schedules: Partial<MedicationSchedule>[] = input.schedules.map(s => ({
                schedule_type: s.type,
                time_of_day: s.time, // "HH:MM"
                days_of_week: s.days, // Phase 2: array of numbers [0-6]
                anchor: s.anchor,
                definition_id: s.definition_id,
                is_active: true
            }));

            return medicationService.addMedicationWithSchedules(userId, profile, schedules);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medication_profiles'] });
            queryClient.invalidateQueries({ queryKey: ['medication_schedules'] });
        }
    });

    const updateMedicationMutation = useMutation({
        mutationFn: async (input: {
            id: string,
            profileUpdates: Partial<MedicationProfile>,
            // Replaces schedules entirely for simplicity in Phase 1/1.5
            newSchedules?: { type: 'daily' | 'prn', time?: string, anchor?: string, definition_id?: string }[]
        }) => {
            // 1. Update Profile
            await medicationService.updateProfile(input.id, input.profileUpdates);

            // 2. Handle Schedules (For now, if provided, we might need a better strategy than "delete all and recreate" to preserve schedule IDs for logs, 
            // but logs link to schedule_id. If we delete schedule, logs might cascade delete or set null.
            // PHASE 1.5 Safe Strategy:
            // - We won't re-implement full schedule diffing here.
            // - We will assume for now users "Manage" specific schedules separately OR we just append.
            // - Actually, user requested "Edit" modal. 
            // - If we delete schedules, we lose log links if ON DELETE CASCADE/SET NULL.
            // - Let's stick to Profile Updates only for this mutation for safety, and warn/implement schedule management separately?
            // - Or: Just update profile fields in this mutation.
            return;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medication_profiles'] });
        }
    });

    const deleteMedicationMutation = useMutation({
        mutationFn: async (id: string) => {
            return medicationService.deleteProfile(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medication_profiles'] });
            queryClient.invalidateQueries({ queryKey: ['medication_schedules'] });
            queryClient.invalidateQueries({ queryKey: ['medication_logs'] });
        }
    });

    // --- Mutations: Custom Schedules (Phase 4/5) ---
    const createScheduleMutation = useMutation({
        mutationFn: async (sche: { name: string, time: string, days_of_week?: number[] }) => {
            if (!userId) throw new Error("No user");
            return medicationService.createCustomSchedule({ ...sche, user_id: userId });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['medication_custom_schedules'] })
    });

    const updateScheduleMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
            return medicationService.updateCustomSchedule(id, updates);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['medication_custom_schedules'] })
    });

    const deleteScheduleMutation = useMutation({
        mutationFn: async (id: string) => {
            return medicationService.deleteCustomSchedule(id);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['medication_custom_schedules'] })
    });

    const assignMedsMutation = useMutation({
        mutationFn: async ({ scheduleId, medIds }: { scheduleId: string, medIds: string[] }) => {
            return medicationService.manageScheduleAssignments(scheduleId, medIds);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['medication_custom_schedules'] })
    });

    const saveComplexScheduleMutation = useMutation({
        mutationFn: async (input: {
            userId: string,
            scheduleData: { id?: string, name: string, description?: string, is_active?: boolean },
            entries: { medication_id: string, day_of_week: number, time: string, dose_override?: string }[]
        }) => {
            return medicationService.saveComplexSchedule(input.userId, input.scheduleData, input.entries);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['medication_custom_schedules'] })
    });


    return {
        doses,
        profiles,
        customSchedules, // Exposed for Phase 4
        stats: {
            total: doses.filter(d => !d.is_prn).length,
            taken: doses.filter(d => d.status === 'taken' && !d.is_prn).length,
            missed: doses.filter(d => d.status === 'missed').length,
            due: doses.filter(d => d.status === 'due').length
        },
        isLoading: !profiles || !customSchedules,

        // Log Actions
        logDose: logDoseMutation.mutate,
        deleteLog: deleteLogMutation.mutate,

        // Profile Actions
        addMedication: addMedicationMutation.mutate,
        updateMedicationProfile: updateMedicationMutation.mutate,
        deleteMedication: deleteMedicationMutation.mutate,

        // Custom Schedule Actions
        createSchedule: createScheduleMutation.mutateAsync,
        updateSchedule: updateScheduleMutation.mutateAsync,
        deleteSchedule: deleteScheduleMutation.mutateAsync,
        assignMedsToSchedule: assignMedsMutation.mutateAsync, // Legacy simple
        saveComplexSchedule: saveComplexScheduleMutation.mutateAsync, // Phase 5

        isAdding: addMedicationMutation.isPending
    };
}
