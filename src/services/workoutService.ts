import { supabase } from '../lib/supabase';
import { getTodayLocal } from '../utils/date';

export type WorkoutSet = {
    id: string;
    set_number: number;
    weight: number | null;
    reps: number | null;
    duration_seconds: number | null;
    completed_at: string;
};

export type WorkoutExerciseSummary = {
    id: string;
    name: string;
    muscle_group: string | null;
    sets: WorkoutSet[];
    setsCount: number;
    minWeight: number | null;
    maxWeight: number | null;
};

export type WorkoutSessionSummary = {
    id: string;
    name: string | null;
    template_id?: string | null;
    status: 'in_progress' | 'completed' | 'abandoned';
    started_at: string | null;
    ended_at: string | null;
    total_sets: number;
    created_at: string;
    exercises: WorkoutExerciseSummary[];
};

export type ExerciseType = 'time' | 'weight_reps' | 'reps_only' | 'time_and_weight';

export type TemplateExercise = {
    id: string;
    template_id: string;
    name: string;
    muscle_group?: string | null;
    order_index: number;
    exercise_type: ExerciseType;
    default_sets: number;
    default_target_reps?: number | null;
    default_target_weight?: number | null;
    default_duration_seconds?: number | null;
    has_timer: boolean;
    created_at?: string;
};


export const workoutService = {
    // --- Session Management (With Mock) ---

    async startWorkoutFromTemplate(userId: string, templateId: string) {
        try {
            // 1. Fetch the FULL template with exercises (for snapshot)
            const { data: template, error: templateError } = await supabase
                .from('workout_templates')
                .select(`
                    *,
                    workout_template_exercises (*)
                `)
                .eq('id', templateId)
                .single();

            if (templateError) throw templateError;

            // 2. Create session with snapshot
            const { data: session, error: sessionError } = await supabase
                .from('workout_sessions')
                .insert({
                    user_id: userId,
                    template_id: templateId,
                    name: template.name,
                    date: new Date().toISOString().split('T')[0],
                    status: 'in_progress',
                    started_at: new Date().toISOString(),
                    total_sets: 0,
                    // NEW: Save template snapshot
                    session_snapshot: template,
                    current_exercise_index: 0,
                    current_set_index: 0
                })
                .select()
                .single();

            if (sessionError) throw sessionError;

            // 3. Create session exercises from template
            // CRITICAL: Copy ALL config from template so session UI shows correct progression, targets, and rest
            const sessionExercises = template.workout_template_exercises
                .sort((a: any, b: any) => a.order_index - b.order_index)
                .map((te: any) => ({
                    session_id: session.id,
                    template_exercise_id: te.id,
                    name: te.name,
                    muscle_group: te.muscle_group,
                    order_index: te.order_index,
                    exercise_type: te.exercise_type,
                    default_duration_seconds: te.default_duration_seconds,
                    default_target_reps: te.default_target_reps,
                    default_target_weight: te.default_target_weight,
                    has_timer: te.has_timer,
                    // Copy per-set config (reps/weight per set for progression)
                    per_set_config: te.per_set_config,
                    default_sets: te.default_sets || 3,
                    // Copy progression type (Fixed, Increasing, Drop Sets, Pyramid)
                    progression_type: te.progression_type || 'none',
                    // Copy rest settings
                    rest_seconds: te.rest_seconds || 60,
                    rest_between_exercises_enabled: te.rest_between_exercises_enabled || false,
                    rest_between_exercises_seconds: te.rest_between_exercises_seconds || 90
                }));

            console.log('🏋️ Creating session exercises with config:', sessionExercises.map((e: any) => ({
                name: e.name,
                progression: e.progression_type,
                perSetConfig: e.per_set_config,
                restSecs: e.rest_seconds
            })));

            const { error: exercisesError } = await supabase
                .from('workout_session_exercises')
                .insert(sessionExercises);

            if (exercisesError) throw exercisesError;

            return { session, sessionExercises };
        } catch (e) {
            console.warn("Supabase Start Workout Failed, using Mock:", e);
            return startLocalSessionFromTemplate(userId, templateId);
        }
    },

    async startEmptySession(userId: string) {
        try {
            const { data: session, error } = await supabase
                .from('workout_sessions')
                .insert({
                    user_id: userId,
                    name: "Quick Workout",
                    date: getTodayLocal(),
                    status: 'in_progress',
                    started_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;
            return session;
        } catch (e) {
            console.warn("Supabase Start Empty Session Failed, using Mock:", e);
            return startLocalEmptySession(userId);
        }
    },

    async logSet(sessionExerciseId: string, data: { weight?: number; reps?: number; durationSeconds?: number }) {
        try {
            // 1. Get current max set number to increment
            const { count, error: countError } = await supabase
                .from('workout_sets')
                .select('*', { count: 'exact', head: true })
                .eq('session_exercise_id', sessionExerciseId);

            if (countError) throw countError;
            const setNumber = (count || 0) + 1;

            const { data: set, error: setError } = await supabase
                .from('workout_sets')
                .insert({
                    session_exercise_id: sessionExerciseId,
                    set_number: setNumber,
                    weight: data.weight,
                    reps: data.reps,
                    duration_seconds: data.durationSeconds,
                    completed_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (setError) throw setError;
            return set;
        } catch (e) {
            console.warn("Supabase Log Set Failed, using Mock:", e);
            return logLocalSet(sessionExerciseId, data);
        }
    },

    async completeWorkout(sessionId: string) {
        try {
            // Count logic is complex to replicate exactly with single queries, but we try best effort
            const { data: exercises } = await supabase
                .from('workout_session_exercises')
                .select('id, workout_sets(id)')
                .eq('session_id', sessionId);

            const calculatedTotalSets = exercises?.reduce((acc, ex) => acc + (ex.workout_sets?.length || 0), 0) || 0;

            const { data: session, error: updateError } = await supabase
                .from('workout_sessions')
                .update({
                    status: 'completed',
                    ended_at: new Date().toISOString(),
                    total_sets: calculatedTotalSets
                })
                .eq('id', sessionId)
                .select()
                .single();

            if (updateError) throw updateError;
            return session;
        } catch (e) {
            console.warn("Supabase Complete Workout Failed, using Mock:", e);
            return completeLocalWorkout(sessionId);
        }
    },

    /**
     * Get workouts for a specific date (for Diary Card).
     * Includes both SESSIONS and SCHEDULED items.
     */
    async getWorkoutsForDate(userId: string, date: string) {
        // Fetch Sessions
        let sessions: WorkoutSessionSummary[] = [];
        try {
            const { data, error } = await supabase
                .from('workout_sessions')
                .select(`
                    *,
                    workout_session_exercises (
                        id, name, muscle_group, order_index,
                        workout_sets (id, set_number, weight, reps, duration_seconds, completed_at)
                    )
                `)
                .eq('user_id', userId)
                .eq('date', date)
                .order('created_at', { ascending: true });

            if (error) throw error;

            sessions = (data || []).map((session: any) => ({
                id: session.id,
                name: session.name,
                status: session.status,
                started_at: session.started_at,
                ended_at: session.ended_at,
                total_sets: session.total_sets,
                template_id: session.template_id,
                created_at: session.created_at,
                exercises: (session.workout_session_exercises || [])
                    .sort((a: any, b: any) => a.order_index - b.order_index)
                    .map((ex: any) => {
                        const sets = ex.workout_sets || [];
                        const weights = sets.map((s: any) => Number(s.weight)).filter((w: number) => !isNaN(w) && w > 0);
                        return {
                            id: ex.id,
                            name: ex.name,
                            muscle_group: ex.muscle_group,
                            sets: sets,
                            setsCount: sets.length,
                            minWeight: weights.length > 0 ? Math.min(...weights) : null,
                            maxWeight: weights.length > 0 ? Math.max(...weights) : null,
                        };
                    }),
            }));

        } catch (e) {
            console.warn("Supabase Get Sessions Failed, using Mock:", e);
            sessions = getLocalSessionsForDate(userId, date);
        }

        // Fetch Schedule with Template Exercises
        let scheduled: any[] = [];
        try {
            const { data, error } = await supabase
                .from('workout_schedule')
                .select('*, workout_templates(name, workout_template_exercises(*))')
                .eq('user_id', userId)
                .eq('scheduled_date', date);

            if (error) throw error;
            scheduled = data || [];
        } catch (e) {
            console.warn("Supabase Get Schedule Failed, using Mock:", e);
            scheduled = getLocalScheduleForDate(userId, date);
        }

        return { sessions, scheduled };
    },

    async deleteSession(sessionId: string) {
        try {
            const { error } = await supabase.from('workout_sessions').delete().eq('id', sessionId);
            if (error) throw error;
        } catch (e) {
            deleteLocalSession(sessionId);
        }
    },

    async getSessionDetails(sessionId: string) {
        try {
            const { data, error } = await supabase
                .from('workout_sessions')
                .select(`
                    id, user_id, template_id, name, date, status, started_at, ended_at, total_sets, notes, created_at,
                    current_exercise_index, current_set_index,
                    workout_templates(
                        id, name, 
                        workout_template_exercises(
                            id, name, exercise_type, muscle_group, order_index,
                            default_sets, default_reps, default_target_reps,
                            default_target_weight, default_duration_seconds, has_timer
                        )
                    ),
                    workout_session_exercises(
                        id, session_id, template_exercise_id, name, muscle_group, order_index,
                        exercise_type, default_duration_seconds, default_target_reps,
                        default_target_weight, has_timer, started_at, ended_at, created_at,
                        default_sets, per_set_config, progression_type, 
                        rest_seconds, rest_between_exercises_enabled, rest_between_exercises_seconds,
                        workout_sets(id, set_number, weight, reps, duration_seconds, completed_at)
                    )
                `)
                .eq('id', sessionId)
                .single();

            if (error) throw error;
            console.log('✅ Session fetched with full config:', {
                exercises: data?.workout_session_exercises?.map((e: any) => ({
                    name: e.name,
                    progression: e.progression_type,
                    perSetConfig: e.per_set_config,
                    sets: e.default_sets
                }))
            });
            return data;
        } catch (e) {
            console.warn("Supabase Get Session Details Failed, using Mock:", e);
            // Mock fallback - find session in local storage
            return getLocalSessionDetails(sessionId);
        }
    },

    // --- Template Management (Existing Mock) ---

    async getTemplates(userId: string) {
        try {
            const { data, error } = await supabase
                .from('workout_templates')
                .select('*, workout_template_exercises(*)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn("Supabase Template Fetch Failed, using Mock:", e);
            return getLocalTemplates(userId);
        }
    },

    async saveWorkoutTemplate(userId: string, data: { id?: string, name: string, exercises: any[] }) {
        try {
            // 1. Upsert template
            const { data: template, error: templateError } = await supabase
                .from('workout_templates')
                .upsert({
                    id: data.id || undefined,
                    user_id: userId,
                    name: data.name,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (templateError) throw templateError;

            // 2. Delete old exercises if editing
            if (data.id) {
                await supabase
                    .from('workout_template_exercises')
                    .delete()
                    .eq('template_id', data.id);
            }

            // 3. Insert new exercises with all fields
            const exercisesToInsert = data.exercises.map((ex, idx) => ({
                template_id: template.id,
                name: ex.name,
                muscle_group: ex.muscle_group,
                order_index: idx,
                exercise_type: ex.exercise_type || 'weight_reps',
                default_sets: ex.default_sets || 3,
                default_reps: ex.default_reps,
                default_rest_seconds: ex.default_rest_seconds,
                default_target_reps: ex.default_target_reps,
                default_target_weight: ex.default_target_weight,
                default_duration_seconds: ex.default_duration_seconds,
                has_timer: ex.has_timer || false,
                // NEW FIELDS
                per_set_config: ex.per_set_config || null,
                progression_type: ex.progression_type || 'none',
                rest_seconds: ex.rest_seconds || 60,
                rest_between_exercises_enabled: ex.rest_between_exercises_enabled || false,
                rest_between_exercises_seconds: ex.rest_between_exercises_seconds || 90
            }));

            const { error: exercisesError } = await supabase
                .from('workout_template_exercises')
                .insert(exercisesToInsert);

            if (exercisesError) throw exercisesError;

            return template;
        } catch (e) {
            console.warn("Supabase Template Save Failed, using Mock:", e);
            return saveLocalTemplate(userId, data);
        }
    },

    async createTemplate(userId: string, name: string, exercises: any[]) {
        return this.saveWorkoutTemplate(userId, { name, exercises });
    },

    async deleteTemplate(templateId: string) {
        try {
            const { error } = await supabase.from('workout_templates').delete().eq('id', templateId);
            if (error) throw error;
        } catch (e) {
            deleteLocalTemplate(templateId);
        }
    },

    // --- Schedule Management (New) ---

    async scheduleWorkout(userId: string, templateId: string, date: string) {
        try {
            const { data, error } = await supabase
                .from('workout_schedule')
                .upsert({
                    user_id: userId,
                    template_id: templateId,
                    scheduled_date: date,
                }, {
                    onConflict: 'user_id,scheduled_date'
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (e) {
            console.warn("Supabase Schedule Failed, using Mock:", e);
            return scheduleLocalWorkout(userId, templateId, date);
        }
    },
    async getUpcomingSchedules(userId: string) {
        try {
            const { data, error } = await supabase
                .from('workout_schedule')
                .select('*')
                .eq('user_id', userId)
                .gte('scheduled_date', getTodayLocal());

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn("Supabase Get All Schedules Mock", e);
            return getLocalUpcomingSchedules(userId);
        }
    },

    // NEW: Update session state (current exercise/set)
    async updateSessionState(sessionId: string, exerciseIndex: number, setIndex: number) {
        try {
            const { error } = await supabase
                .from('workout_sessions')
                .update({
                    current_exercise_index: exerciseIndex,
                    current_set_index: setIndex
                })
                .eq('id', sessionId);

            if (error) throw error;
            return true;
        } catch (e) {
            console.error('Failed to update session state:', e);
            return false;
        }
    },

    // ============================================
    // NEW: State Management Helpers
    // ============================================

    /**
     * Get the complete workout state for a specific date
     * Returns schedule + session data to determine UI state
     */
    async getWorkoutState(userId: string, date: string): Promise<{
        schedule: any | null;
        session: any | null;
        status: 'no_workout' | 'not_started' | 'in_progress' | 'completed' | 'abandoned';
    }> {
        let schedule: any = null; // Declare schedule outside try block
        try {
            // Query schedule and session in parallel
            const [scheduleResult, sessionResult] = await Promise.all([
                supabase
                    .from('workout_schedule')
                    .select(`
                        *,
                        workout_templates(
                            id,
                            name,
                            workout_template_exercises(
                                id,
                                name,
                                order_index,
                                exercise_type,
                                default_sets,
                                default_reps,
                                default_duration_seconds,
                                per_set_config
                            )
                        )
                    `)
                    .eq('user_id', userId)
                    .eq('scheduled_date', date)
                    .maybeSingle(),
                supabase
                    .from('workout_sessions')
                    .select(`
                        *,
                        workout_session_exercises(
                            id,
                            name,
                            order_index,
                            exercise_type,
                            workout_sets(
                                id,
                                set_number,
                                reps,
                                weight
                            )
                        )
                    `)
                    .eq('user_id', userId)
                    .eq('date', date)
                    .maybeSingle()
            ]);

            schedule = scheduleResult.data;
            let session = sessionResult.data;

            // Process session exercises to add setsCount
            if (session?.workout_session_exercises) {
                session = {
                    ...session,
                    exercises: session.workout_session_exercises.map((ex: any) => ({
                        ...ex,
                        setsCount: ex.workout_sets?.length || 0,
                        minWeight: ex.workout_sets?.length > 0
                            ? Math.min(...ex.workout_sets.map((s: any) => Number(s.weight) || 0))
                            : 0,
                        maxWeight: ex.workout_sets?.length > 0
                            ? Math.max(...ex.workout_sets.map((s: any) => Number(s.weight) || 0))
                            : 0
                    }))
                };
            }

            // Determine status based on state machine rules
            let status: 'no_workout' | 'not_started' | 'in_progress' | 'completed' | 'abandoned';

            if (!schedule && !session) {
                status = 'no_workout';
            } else if (schedule && !session) {
                status = 'not_started';
            } else if (session) {
                status = session.status as any;
            } else {
                status = 'no_workout';
            }

            return { schedule, session, status };
        } catch (error) {
            console.error('Error getting workout state:', error);
            return { schedule, session: null, status: 'no_workout' };
        }
    },

    /**
     * Reset workout for a specific date
     * Deletes session data but keeps the schedule
     */
    async resetWorkout(userId: string, date: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('workout_sessions')
                .delete()
                .eq('user_id', userId)
                .eq('date', date);

            if (error) throw error;
        } catch (error) {
            console.error('Error resetting workout:', error);
            throw error;
        }
    },

    /**
     * Change the scheduled workout for a specific date
     * Updates schedule and deletes any existing session
     */
    async changeScheduledWorkout(userId: string, date: string, newTemplateId: string): Promise<void> {
        try {
            // 1. Delete any existing session for this date
            await supabase
                .from('workout_sessions')
                .delete()
                .eq('user_id', userId)
                .eq('date', date);

            // 2. Update or insert schedule
            const { data: existing } = await supabase
                .from('workout_schedule')
                .select('id')
                .eq('user_id', userId)
                .eq('scheduled_date', date)
                .maybeSingle();

            if (existing) {
                // Update existing schedule
                const { error } = await supabase
                    .from('workout_schedule')
                    .update({ template_id: newTemplateId })
                    .eq('id', existing.id);

                if (error) throw error;
            } else {
                // Insert new schedule
                const { error } = await supabase
                    .from('workout_schedule')
                    .insert({
                        user_id: userId,
                        template_id: newTemplateId,
                        scheduled_date: date,
                        status: 'scheduled'
                    });

                if (error) throw error;
            }
        } catch (error) {
            console.error('Error changing scheduled workout:', error);
            throw error;
        }
    }
};

// --- Mock Helpers (LocalStorage) ---

function getLocal(key: string) {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
}
function setLocal(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Templates
function getLocalTemplates(userId: string) {
    return getLocal(`mock_templates_${userId}`);
}
function saveLocalTemplate(userId: string, data: any) {
    const list = getLocalTemplates(userId);
    const now = new Date().toISOString();
    let item;
    if (data.id) {
        const idx = list.findIndex((t: any) => t.id === data.id);
        if (idx !== -1) {
            list[idx] = { ...list[idx], name: data.name, updated_at: now, workout_template_exercises: mapMockEx(data.id, data.exercises) };
            item = list[idx];
        } else {
            item = createMockTmpl(userId, data, now); list.unshift(item);
        }
    } else {
        item = createMockTmpl(userId, data, now); list.unshift(item);
    }
    setLocal(`mock_templates_${userId}`, list);
    return item;
}
function createMockTmpl(userId: string, data: any, now: string) {
    const id = `mock-tmpl-${Date.now()}`;
    return { id, user_id: userId, name: data.name, created_at: now, updated_at: now, workout_template_exercises: mapMockEx(id, data.exercises) };
}
function mapMockEx(tmplId: string, exs: any[]) {
    return exs.map((ex, i) => ({
        id: `mock-ex-${Date.now()}-${i}`,
        template_id: tmplId,
        name: ex.name,
        muscle_group: ex.muscleGroup || ex.muscle_group,
        exercise_type: ex.exercise_type || 'weight_reps',
        default_sets: Number(ex.defaultSets || ex.default_sets || 3),
        default_reps: Number(ex.defaultReps || ex.default_reps || ex.default_target_reps || 10),
        default_target_reps: ex.default_target_reps || ex.defaultReps || ex.default_reps || null,
        default_target_weight: ex.default_target_weight || ex.defaultWeight || ex.default_weight || null,
        default_duration_seconds: ex.default_duration_seconds || null,
        has_timer: ex.has_timer || false,
        order_index: i
    }));
}
function deleteLocalTemplate(id: string) {
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith('mock_templates_')) {
            const l = getLocal(k).filter((t: any) => t.id !== id);
            setLocal(k, l);
        }
    });
}

// Sessions
function startLocalSessionFromTemplate(userId: string, templateId: string) {
    const templates = getLocalTemplates(userId);
    const tmpl = templates.find((t: any) => t.id === templateId);
    if (!tmpl) throw new Error("Template not found in mock");

    const sessionId = `mock-sess-${Date.now()}`;
    const session = {
        id: sessionId,
        user_id: userId,
        template_id: templateId,
        name: tmpl.name,
        date: getTodayLocal(),
        status: 'in_progress', // 'in_progress'
        started_at: new Date().toISOString(),
        total_sets: 0
    };

    // Create exercises
    const sessionExs = (tmpl.workout_template_exercises || []).map((ex: any, i: number) => ({
        id: `mock-sess-ex-${Date.now()}-${i}`,
        session_id: sessionId,
        template_exercise_id: ex.id,
        name: ex.name,
        muscle_group: ex.muscle_group,
        order_index: ex.order_index,
        workout_sets: []
    }));

    // Save
    const sessions = getLocal(`mock_sessions_${userId}`);
    sessions.push({ ...session, workout_session_exercises: sessionExs });
    setLocal(`mock_sessions_${userId}`, sessions);

    return { session, sessionExercises: sessionExs };
}

function getLocalSessionDetails(sessionId: string): any {
    // Scan all mock sessions for matching ID
    let foundSession: any = null;
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith('mock_sessions_') && !foundSession) {
            const list = getLocal(k);
            foundSession = list.find((s: any) => s.id === sessionId);
        }
    });

    if (!foundSession) throw new Error(`Session ${sessionId} not found in mock`);

    // Get template info if template_id exists
    let templateInfo: any = null;
    if (foundSession.template_id) {
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('mock_templates_') && !templateInfo) {
                const templates = getLocal(k);
                templateInfo = templates.find((t: any) => t.id === foundSession.template_id);
            }
        });
    }

    return {
        ...foundSession,
        workout_templates: templateInfo
    };
}

function startLocalEmptySession(userId: string) {
    const sessionId = `mock-sess-${Date.now()}`;
    const session = {
        id: sessionId,
        user_id: userId,
        name: "Quick Workout",
        date: getTodayLocal(),
        status: 'in_progress',
        started_at: new Date().toISOString(),
        workout_session_exercises: []
    };
    const sessions = getLocal(`mock_sessions_${userId}`);
    sessions.push(session);
    setLocal(`mock_sessions_${userId}`, sessions);
    return session;
}

function getLocalSessionsForDate(userId: string, date: string) {
    const all = getLocal(`mock_sessions_${userId}`);
    return all.filter((s: any) => s.date === date).map((s: any) => {
        // Transform for summary
        return {
            ...s,
            exercises: (s.workout_session_exercises || []).map((ex: any) => ({
                id: ex.id,
                name: ex.name,
                muscle_group: ex.muscle_group, // Ensure muscle_group is included
                sets: ex.workout_sets || [],
                setsCount: (ex.workout_sets || []).length,
                minWeight: (ex.workout_sets || []).length > 0 ? Math.min(...ex.workout_sets.map((s: any) => Number(s.weight)).filter((w: number) => !isNaN(w) && w > 0)) : null,
                maxWeight: (ex.workout_sets || []).length > 0 ? Math.max(...ex.workout_sets.map((s: any) => Number(s.weight)).filter((w: number) => !isNaN(w) && w > 0)) : null,
            }))
        };
    });
}

function logLocalSet(sessExId: string, data: any) {
    // Find session with this exercise
    // We need to scan all users keys? No just this user
    // We don't have userId passed to logSet. Strict mock fails here unless we scan all.
    // Hack: Scan keys.
    let found = false;
    let retSet = null;
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith('mock_sessions_') && !found) {
            const list = getLocal(k);
            let modified = false;
            list.forEach((sess: any) => {
                const ex = sess.workout_session_exercises?.find((e: any) => e.id === sessExId);
                if (ex) {
                    if (!ex.workout_sets) ex.workout_sets = [];
                    const setNum = ex.workout_sets.length + 1;
                    const set = {
                        id: `mock-set-${Date.now()}`,
                        session_exercise_id: sessExId,
                        set_number: setNum,
                        weight: data.weight,
                        reps: data.reps,
                        duration_seconds: data.durationSeconds,
                        completed_at: new Date().toISOString()
                    };
                    ex.workout_sets.push(set);
                    retSet = set;
                    modified = true;
                    found = true;
                }
            });
            if (modified) setLocal(k, list);
        }
    });
    return retSet;
}

function completeLocalWorkout(sessionId: string) {
    let retSess = null;
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith('mock_sessions_')) {
            const list = getLocal(k);
            const idx = list.findIndex((s: any) => s.id === sessionId);
            if (idx !== -1) {
                const s = list[idx];
                s.status = 'completed';
                s.ended_at = new Date().toISOString();
                // Calc sets
                let sets = 0;
                s.workout_session_exercises.forEach((ex: any) => sets += (ex.workout_sets?.length || 0));
                s.total_sets = sets;
                list[idx] = s;
                retSess = s;
                setLocal(k, list);
            }
        }
    });
    return retSess;
}

function deleteLocalSession(sessionId: string) {
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith('mock_sessions_')) {
            const list = getLocal(k).filter((s: any) => s.id !== sessionId);
            setLocal(k, list);
        }
    });
}

// Schedule
function scheduleLocalWorkout(userId: string, templateId: string, date: string) {
    const list = getLocal(`mock_schedule_${userId}`);
    const template = getLocalTemplates(userId).find((t: any) => t.id === templateId);
    const tmplName = template?.name || 'Workout';
    const item = {
        id: `mock-sch-${Date.now()}`,
        user_id: userId,
        template_id: templateId,
        scheduled_date: date,
        created_at: new Date().toISOString(),
        workout_templates: {
            name: tmplName,
            workout_template_exercises: template?.workout_template_exercises || []
        }
    };
    list.push(item);
    setLocal(`mock_schedule_${userId}`, list);
    return item;
}

function getLocalScheduleForDate(userId: string, date: string) {
    const list = getLocal(`mock_schedule_${userId}`);
    // Ensure exercises are included
    return list.filter((s: any) => s.scheduled_date === date).map((s: any) => {
        if (!s.workout_templates?.workout_template_exercises) {
            // Backfill exercises if missing (for existing mock data)
            const template = getLocalTemplates(userId).find((t: any) => t.id === s.template_id);
            return {
                ...s,
                workout_templates: {
                    ...s.workout_templates,
                    workout_template_exercises: template?.workout_template_exercises || []
                }
            };
        }
        return s;
    });
}

function getLocalUpcomingSchedules(userId: string) {
    const list = getLocal(`mock_schedule_${userId}`);
    const today = getTodayLocal();
    return list.filter((s: any) => s.scheduled_date >= today);
}
