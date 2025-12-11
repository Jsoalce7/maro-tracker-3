import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Types ---

export type WorkoutSetTemplate = {
    id: string;
    targetReps: number;
    suggestedWeightLb?: number | null;
};

export type WorkoutExerciseTemplate = {
    id: string;
    name: string;
    tags?: string[];
    sets: WorkoutSetTemplate[];
    isSuperset?: boolean;
};

export type WorkoutTemplate = {
    id: string;
    name: string;
    type: "Strength" | "Cardio" | "Mixed";
    exercises: WorkoutExerciseTemplate[];
};

export type WorkoutSetLog = {
    id: string; // Unique ID for keying
    setTemplateId: string | null;
    repsDone: number;
    weightLb?: number | null;
    startedAt: string; // ISO
    finishedAt: string | null; // ISO
    isCompleted: boolean;
};

export type WorkoutExerciseLog = {
    id: string; // Unique ID
    exerciseTemplateId: string | null;
    name: string;
    logs: WorkoutSetLog[];
};

export type WorkoutSession = {
    id: string;
    templateId: string | null;
    date: string; // YYYY-MM-DD
    status: "not_started" | "in_progress" | "completed";
    startedAt?: string;
    finishedAt?: string;
    exercises: WorkoutExerciseLog[];
};

// --- Initial Data ---

const PUSH_DAY_A: WorkoutTemplate = {
    id: "template_1",
    name: "Push Day A",
    type: "Strength",
    exercises: [
        {
            id: "ex_1",
            name: "Bench Press",
            tags: ["Chest", "Barbell"],
            sets: [
                { id: "set_t_1", targetReps: 12, suggestedWeightLb: 135 },
                { id: "set_t_2", targetReps: 10, suggestedWeightLb: 145 },
                { id: "set_t_3", targetReps: 8, suggestedWeightLb: 155 },
            ]
        },
        {
            id: "ex_2",
            name: "Incline DB Press",
            tags: ["Chest", "Dumbbell"],
            sets: [
                { id: "set_t_4", targetReps: 10, suggestedWeightLb: 50 },
                { id: "set_t_5", targetReps: 10, suggestedWeightLb: 50 },
                { id: "set_t_6", targetReps: 10, suggestedWeightLb: 50 },
            ]
        },
        {
            id: "ex_3",
            name: "Overhead Press",
            tags: ["Shoulders", "Barbell"],
            sets: [
                { id: "set_t_7", targetReps: 12, suggestedWeightLb: 95 },
                { id: "set_t_8", targetReps: 12, suggestedWeightLb: 95 },
            ]
        },
        {
            id: "ex_4",
            name: "Tricep Pushdowns",
            tags: ["Triceps", "Cable"],
            sets: [
                { id: "set_t_9", targetReps: 15, suggestedWeightLb: 40 },
                { id: "set_t_10", targetReps: 15, suggestedWeightLb: 40 },
                { id: "set_t_11", targetReps: 15, suggestedWeightLb: 40 },
            ]
        }
    ]
};

// --- Store ---

interface WorkoutStoreState {
    templates: Record<string, WorkoutTemplate>;
    sessions: Record<string, WorkoutSession>; // Keyed by ID
    sessionsByDate: Record<string, string>; // Date -> SessionID

    // Actions
    getTemplate: (id: string) => WorkoutTemplate | undefined;
    getSession: (id: string) => WorkoutSession | undefined;
    getSessionByDate: (date: string) => WorkoutSession | undefined;

    startSession: (date: string, templateId: string) => string; // Returns new session ID
    updateSetLog: (sessionId: string, exerciseIndex: number, setIndex: number, data: Partial<WorkoutSetLog>) => void;
    completeSet: (sessionId: string, exerciseIndex: number, setIndex: number, data: { repsDone: number, weightLb: number }) => void;
    endSession: (sessionId: string) => void;
}

export const useWorkoutStore = create<WorkoutStoreState>()(
    persist(
        (set, get) => ({
            templates: {
                [PUSH_DAY_A.id]: PUSH_DAY_A
            },
            sessions: {},
            sessionsByDate: {},

            getTemplate: (id) => get().templates[id],
            getSession: (id) => get().sessions[id],
            getSessionByDate: (date) => {
                const sessId = get().sessionsByDate[date];
                return sessId ? get().sessions[sessId] : undefined;
            },

            startSession: (date, templateId) => {
                const template = get().templates[templateId];
                if (!template) throw new Error("Template not found");

                const newSessionId = `session_${Date.now()}`;
                const now = new Date().toISOString();

                // Initialize exercises with empty logs based on template
                const exercises: WorkoutExerciseLog[] = template.exercises.map(ex => ({
                    id: `log_ex_${Math.random().toString(36).substr(2, 9)}`,
                    exerciseTemplateId: ex.id,
                    name: ex.name,
                    logs: ex.sets.map(s => ({
                        id: `log_set_${Math.random().toString(36).substr(2, 9)}`,
                        setTemplateId: s.id,
                        repsDone: s.targetReps, // Default to target
                        weightLb: s.suggestedWeightLb, // Default to suggested
                        startedAt: now,
                        finishedAt: null,
                        isCompleted: false
                    }))
                }));

                const newSession: WorkoutSession = {
                    id: newSessionId,
                    templateId: template.id,
                    date: date,
                    status: 'in_progress',
                    startedAt: now,
                    exercises: exercises
                };

                set(state => ({
                    sessions: { ...state.sessions, [newSessionId]: newSession },
                    sessionsByDate: { ...state.sessionsByDate, [date]: newSessionId }
                }));

                return newSessionId;
            },

            updateSetLog: (sessionId, exerciseIndex, setIndex, data) => {
                set(state => {
                    const session = state.sessions[sessionId];
                    if (!session) return state;

                    const newExercises = [...session.exercises];
                    const newLogs = [...newExercises[exerciseIndex].logs];

                    newLogs[setIndex] = { ...newLogs[setIndex], ...data };
                    newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], logs: newLogs };

                    return {
                        sessions: {
                            ...state.sessions,
                            [sessionId]: { ...session, exercises: newExercises }
                        }
                    };
                });
            },

            completeSet: (sessionId, exerciseIndex, setIndex, data) => {
                get().updateSetLog(sessionId, exerciseIndex, setIndex, {
                    ...data,
                    isCompleted: true,
                    finishedAt: new Date().toISOString()
                });
            },

            endSession: (sessionId) => {
                set(state => {
                    const session = state.sessions[sessionId];
                    if (!session) return state;

                    return {
                        sessions: {
                            ...state.sessions,
                            [sessionId]: {
                                ...session,
                                status: 'completed',
                                finishedAt: new Date().toISOString()
                            }
                        }
                    };
                });
            }
        }),
        {
            name: 'mock-workout-storage', // Persist to localStorage
        }
    )
);
