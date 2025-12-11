// Workout System Types - Complete Type Definitions

export type ExerciseType = 'reps_weight' | 'reps_only' | 'time' | 'timed_weighted';
export type ProgressionType = 'none' | 'increase' | 'decrease' | 'pyramid';

export interface SetConfig {
    set: number;
    reps?: number;
    weight?: number;
    duration_seconds?: number;
}

export interface TemplateExercise {
    id: string;
    template_id: string;
    name: string;
    exercise_type: ExerciseType;
    muscle_group?: string;
    order_index: number;

    // Set configuration
    default_sets: number;
    per_set_config: SetConfig[];
    progression_type: ProgressionType;
    rest_seconds: number;

    // Legacy fields (for backward compatibility)
    default_reps?: number;
    default_target_reps?: number;
    default_target_weight?: number;
    default_duration_seconds?: number;
    has_timer?: boolean;

    notes?: string;
    created_at?: string;
}

export interface WorkoutTemplate {
    id: string;
    user_id: string;
    name: string;
    created_at: string;
    updated_at: string;
    exercises?: TemplateExercise[];
    workout_template_exercises?: TemplateExercise[];
}

export interface SessionState {
    exerciseIndex: number;
    setIndex: number;
    currentExercise: TemplateExercise;
    currentSet: SetConfig;
    completedSets: CompletedSet[];
}

export interface CompletedSet {
    id?: string;
    session_exercise_id: string;
    set_number: number;
    reps?: number;
    weight?: number;
    duration_seconds?: number;
    completed_at: string;
}

export interface WorkoutSessionSummary {
    id: string;
    template_id: string;
    name: string;
    status: 'in_progress' | 'completed' | 'abandoned';
    total_sets: number;
    started_at?: string;
    ended_at?: string;
    created_at: string;
}

export interface WorkoutSession {
    id: string;
    user_id: string;
    template_id: string;
    name: string;
    date: string;
    status: 'in_progress' | 'completed' | 'abandoned';
    started_at?: string;
    ended_at?: string;
    total_sets: number;
    notes?: string;

    // New fields for session state
    session_snapshot?: WorkoutTemplate;
    current_exercise_index: number;
    current_set_index: number;

    created_at: string;
}

export interface SessionExercise {
    id: string;
    session_id: string;
    template_exercise_id?: string;
    name: string;
    muscle_group?: string;
    order_index: number;
    exercise_type: ExerciseType;
    default_duration_seconds?: number;
    default_target_reps?: number;
    default_target_weight?: number;
    has_timer?: boolean;
    per_set_config?: SetConfig[];
    started_at?: string;
    ended_at?: string;
    created_at: string;
}
