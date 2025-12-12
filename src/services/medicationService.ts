import { supabase } from '../lib/supabase';
import { MedicationProfile, MedicationSchedule, MedicationLog, MedicationLogStatus, MedicationScheduleDefinition } from '../types/medication';

export const medicationService = {
    // --- Schedule Definitions (Phase 1.5) ---
    async getScheduleDefinitions(userId: string) {
        const { data, error } = await supabase
            .from('medication_schedule_definitions')
            .select('*')
            .eq('user_id', userId)
            .order('name');

        if (error) throw error;
        return data as MedicationScheduleDefinition[];
    },

    async createScheduleDefinition(def: Partial<MedicationScheduleDefinition>) {
        const { data, error } = await supabase
            .from('medication_schedule_definitions')
            .insert([def])
            .select()
            .single();

        if (error) throw error;
        return data as MedicationScheduleDefinition;
    },

    async updateScheduleDefinition(id: string, updates: Partial<MedicationScheduleDefinition>) {
        const { data, error } = await supabase
            .from('medication_schedule_definitions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as MedicationScheduleDefinition;
    },

    async deleteScheduleDefinition(id: string) {
        const { error } = await supabase
            .from('medication_schedule_definitions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Phase 4 Refactor: Custom Schedules ---
    async getCustomSchedules(userId: string) {
        const { data, error } = await supabase
            .from('medication_custom_schedules')
            .select(`
                *,
                medication_assignments:medication_schedule_assignments(medication_id),
                entries:medication_schedule_entries(*)
            `)
            .eq('user_id', userId)
            // .order('time', { ascending: true }); // 'time' is legacy/simple. Complex schedules might not have a single time. 
            // We can order by created_at or name.
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async createCustomSchedule(schedule: { user_id: string, name: string, time: string, days_of_week?: number[] }) {
        const { data, error } = await supabase
            .from('medication_custom_schedules')
            .insert([schedule])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateCustomSchedule(id: string, updates: { name?: string, time?: string, days_of_week?: number[], is_active?: boolean }) {
        const { data, error } = await supabase
            .from('medication_custom_schedules')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteCustomSchedule(id: string) {
        const { error } = await supabase
            .from('medication_custom_schedules')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async manageScheduleAssignments(scheduleId: string, medicationIds: string[]) {
        // 1. Delete existing for this schedule
        // Simple approach: Delete all and re-insert.
        // Ideally we diff, but for MVP this ensures sync.
        await supabase.from('medication_schedule_assignments').delete().eq('schedule_id', scheduleId);

        // 2. Insert new
        if (medicationIds.length > 0) {
            const rows = medicationIds.map(mid => ({ schedule_id: scheduleId, medication_id: mid }));
            const { error } = await supabase.from('medication_schedule_assignments').insert(rows);
            if (error) throw error;
        }
    },

    // Phase 5: Save Complex Schedule (Entries + Metadata)
    async saveComplexSchedule(
        userId: string,
        scheduleData: { id?: string, name: string, description?: string, is_active?: boolean },
        entries: { medication_id: string, day_of_week: number, time: string, dose_override?: string }[]
    ) {
        let scheduleId = scheduleData.id;

        // 1. Upsert Schedule Metadata
        if (scheduleId) {
            const { error } = await supabase
                .from('medication_custom_schedules')
                .update({ ...scheduleData, updated_at: new Date().toISOString() })
                .eq('id', scheduleId);
            if (error) throw error;
        } else {
            const { data, error } = await supabase
                .from('medication_custom_schedules')
                .insert([{ ...scheduleData, user_id: userId, time: '00:00:00' }]) // default time for legacy constraint
                .select()
                .single();
            if (error) throw error;
            scheduleId = data.id;
        }

        if (!scheduleId) throw new Error("Failed to resolve schedule ID");

        // 2. Replace Entries (Clear all and re-insert)
        const { error: delError } = await supabase
            .from('medication_schedule_entries')
            .delete()
            .eq('schedule_id', scheduleId);
        if (delError) throw delError;

        if (entries.length > 0) {
            const rows = entries.map(e => ({
                ...e,
                schedule_id: scheduleId
            }));
            const { error: insError } = await supabase
                .from('medication_schedule_entries')
                .insert(rows);
            if (insError) throw insError;
        }

        // 3. Update Assignments (Legacy support for simple filters)
        // We will derive "Assigned Meds" from the entries to keep the junction table in sync for "Schedule Filters" to work.
        const distinctMedIds = [...new Set(entries.map(e => e.medication_id))];
        await this.manageScheduleAssignments(scheduleId, distinctMedIds);

        return scheduleId;
    },

    // --- Profiles ---
    async getProfiles(userId: string) {
        const { data, error } = await supabase
            .from('medication_profiles')
            .select('*')
            .eq('user_id', userId)
            .order('name');

        if (error) throw error;
        return data as MedicationProfile[];
    },

    async createProfile(profile: Partial<MedicationProfile>) {
        const { data, error } = await supabase
            .from('medication_profiles')
            .insert([profile])
            .select()
            .single();

        if (error) throw error;
        return data as MedicationProfile;
    },

    async updateProfile(id: string, updates: Partial<MedicationProfile>) {
        // Ensure complex json/array fields are handled if passed (Supabase JS handles standard JSON)
        const { data, error } = await supabase
            .from('medication_profiles')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as MedicationProfile;
    },

    async deleteProfile(id: string) {
        const { error } = await supabase
            .from('medication_profiles')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Schedules ---
    async getActiveSchedules(userId: string) {
        const { data, error } = await supabase
            .from('medication_schedules')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) throw error;
        return data as MedicationSchedule[];
    },

    async createSchedule(schedule: Partial<MedicationSchedule>) {
        const { data, error } = await supabase
            .from('medication_schedules')
            .insert([schedule])
            .select()
            .single();

        if (error) throw error;
        return data as MedicationSchedule;
    },

    // Helper: Create Profile + Schedules transactionally (conceptually)
    async addMedicationWithSchedules(
        userId: string,
        profile: Partial<MedicationProfile>,
        schedules: Partial<MedicationSchedule>[]
    ) {
        // 1. Create Profile
        const newProfile = await this.createProfile({ ...profile, user_id: userId });

        // 2. Create Schedules
        const createdSchedules = [];
        for (const sch of schedules) {
            const payload: any = {
                ...sch,
                user_id: userId,
                medication_id: newProfile.id,
                is_active: true
            };
            const newSch = await this.createSchedule(payload);
            createdSchedules.push(newSch);
        }

        return { profile: newProfile, schedules: createdSchedules };
    },

    // --- Logs ---
    async getLogsForRange(userId: string, start: string, end: string) {
        const { data, error } = await supabase
            .from('medication_logs')
            .select('*')
            .eq('user_id', userId)
            .gte('date', start) // Assuming date check is sufficient for logs which have a 'date' column now
            .lte('date', end);

        if (error) throw error;
        return data as MedicationLog[];
    },

    async getRecentLogs(userId: string, limit = 50) {
        const { data, error } = await supabase
            .from('medication_logs')
            .select('*')
            .eq('user_id', userId)
            .order('taken_at', { ascending: false }) // or date/time
            .limit(limit);

        if (error) throw error;
        return data as MedicationLog[];
    },

    async logDose(
        userId: string,
        medicationId: string,
        scheduleId: string | undefined | null, // undefined for PRN
        date: string,
        status: MedicationLogStatus,
        plannedTime: string | null | undefined
    ) {
        // Upsert based on unique constraint (user_id, schedule_id, date) for scheduled
        // For PRN (scheduleId null), we always INSERT, never upsert on unique constraint (since index ignores null)
        // Actually, for PRN we might want to just insert.

        const payload = {
            user_id: userId,
            medication_id: medicationId,
            schedule_id: scheduleId || null,
            date: date,
            status: status,
            planned_time: plannedTime || null,
            taken_at: status === 'taken' ? new Date().toISOString() : null
        };

        if (scheduleId) {
            // Scheduled: Upsert
            const { data, error } = await supabase
                .from('medication_logs')
                .upsert(payload, { onConflict: 'user_id,schedule_id,date' })
                .select()
                .single();
            if (error) throw error;
            return data as MedicationLog;
        } else {
            // PRN: Insert always
            const { data, error } = await supabase
                .from('medication_logs')
                .insert(payload)
                .select()
                .single();
            if (error) throw error;
            return data as MedicationLog;
        }
    },

    async deleteLog(logId: string) {
        const { error } = await supabase
            .from('medication_logs')
            .delete()
            .eq('id', logId);

        if (error) throw error;
    }
};
