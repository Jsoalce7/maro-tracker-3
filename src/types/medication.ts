export type MedicationScheduleType = 'daily' | 'specific_days' | 'prn';
export type MedicationLogStatus = 'taken' | 'missed' | 'skipped';

export interface ActiveIngredient {
    name: string;
    amount: number;
    unit: string;
}

export interface MedicationProfile {
    id: string;
    user_id: string;
    name: string;
    brand?: string;
    category_tags?: string[];
    medication_tags?: string[]; // Phase 1.5: e.g. ['Drowsy']
    active_ingredients?: ActiveIngredient[]; // Phase 1.5: JSONB
    current_stock?: number; // Phase 3
    low_stock_threshold?: number; // Phase 3
    strength_value?: number;
    strength_unit?: string;
    form?: string;
    dose_quantity?: string; // "1 pill"
    take_daily: boolean; // Refactor: Phase 4
    is_favorite?: boolean; // Phase 5
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

export interface MedicationScheduleDefinition { // Phase 1.5
    id: string;
    user_id: string;
    name: string;
    default_time?: string;
    default_anchor?: string;
    created_at: string;
    updated_at: string;
}

export interface MedicationSchedule {
    // Legacy / Phase 1 - Deprecated but kept for type safety if needed during migration
    id: string;
    medication_id: string;
    schedule_type: 'daily' | 'prn' | 'specific_days';
    time_of_day?: string; // HH:MM:SS
    days_of_week?: number[]; // [0-6]
    definition_id?: string; // Phase 1.5
    anchor?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Phase 4/5: Custom Schedules
export interface ScheduleEntry {
    id: string;
    schedule_id: string;
    medication_id: string;
    day_of_week: number;
    time: string;
    dose_override?: string;
}

export interface ScheduleAssignment {
    id: string;
    schedule_id: string;
    medication_id: string;
}

export interface CustomSchedule {
    id: string;
    user_id: string;
    name: string;
    description?: string; // Phase 5
    time: string; // Legacy simple view
    days_of_week?: number[]; // Legacy simple view
    entries?: ScheduleEntry[]; // Phase 5
    medication_assignments?: ScheduleAssignment[]; // Phase 4
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface MedicationLog {
    id: string;
    user_id: string;
    medication_id: string;
    schedule_id?: string;
    date: string; // YYYY-MM-DD
    status: MedicationLogStatus;
    planned_time?: string; // ISO
    taken_at?: string; // ISO
    quantity_taken?: string;
    note?: string;
    created_at: string;
}

// Derived UI Types
export interface MedicationDose {
    id: string; // Log ID or generated ID
    medication: MedicationProfile;
    schedule?: CustomSchedule | MedicationSchedule; // Updated to support CustomSchedule

    // Status
    status: MedicationDoseStatus | 'due';

    // Time
    planned_time?: Date;
    time_display: string;

    // Log Data
    is_logged: boolean;
    log_id?: string;
    taken_at?: Date;

    // Helper
    is_prn: boolean;
    dose_override?: string; // Phase 5
}

// Re-export for compatibility with UI components if names overlap
export type MedicationDoseStatus = 'due' | 'taken' | 'missed' | 'skipped';
