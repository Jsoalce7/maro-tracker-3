import { create } from 'zustand';
import { MealType } from '../types';

interface AppState {
    // Current day & navigation
    selectedDate: string; // YYYY-MM-DD

    // UI Consumables
    showAddFood: boolean;
    selectedMealType: MealType | null;

    // Actions
    setSelectedDate: (date: string) => void;
    openAddFood: (mealType: MealType) => void;
    closeAddFood: () => void;
}

// Get today's date in YYYY-MM-DD format (User's Local Time)
const getToday = () => {
    const d = new Date();
    // Adjust for timezone offset to get local YYYY-MM-DD
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().split('T')[0];
};

export const useAppStore = create<AppState>((set) => ({
    // Initial state
    selectedDate: getToday(),
    showAddFood: false,
    selectedMealType: null,

    // Actions
    setSelectedDate: (date) => set({ selectedDate: date }),

    openAddFood: (mealType) => set({ showAddFood: true, selectedMealType: mealType }),

    closeAddFood: () => set({ showAddFood: false, selectedMealType: null }),
}));

