export interface WorkoutScheduleDefinition {
    id: string;
    name: string;
    description?: string;
    is_active: boolean; // If true, auto-generates future workouts
    created_at: string;
    updated_at: string;
    entries: WorkoutScheduleEntry[];
}

export interface WorkoutScheduleEntry {
    day_of_week: string; // 'Monday', 'Tuesday', etc.
    template_id: string;
    time?: string; // Optional time of day
}

const STORAGE_KEY_PREFIX = 'workout_schedule_definitions_';

export const workoutScheduleStorage = {
    getDefinitions(userId: string): WorkoutScheduleDefinition[] {
        if (typeof window === 'undefined') return [];
        try {
            const json = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
            return json ? JSON.parse(json) : [];
        } catch (e) {
            console.error('Failed to load workout schedule definitions', e);
            return [];
        }
    },

    saveDefinition(userId: string, definition: WorkoutScheduleDefinition) {
        const list = this.getDefinitions(userId);
        const index = list.findIndex(d => d.id === definition.id);

        if (index >= 0) {
            list[index] = { ...definition, updated_at: new Date().toISOString() };
        } else {
            list.push({ ...definition, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        }

        localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(list));
        return definition;
    },

    deleteDefinition(userId: string, id: string) {
        const list = this.getDefinitions(userId);
        const newList = list.filter(d => d.id !== id);
        localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(newList));
    },

    getDefinition(userId: string, id: string) {
        const list = this.getDefinitions(userId);
        return list.find(d => d.id === id);
    }
};
