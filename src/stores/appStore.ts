import { create } from 'zustand';
import { MealType } from '../types';
import { getTodayLocal } from '../utils/date';

interface AppState {
    // UI State
    selectedDate: string;
    showAddFood: boolean;
    selectedMealType: MealType | null;

    // Actions
    setSelectedDate: (date: string) => void;
    openAddFood: (mealType: MealType) => void;
    closeAddFood: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    // Initial state
    selectedDate: getTodayLocal(),
    showAddFood: false,
    selectedMealType: null,

    // Actions
    setSelectedDate: (date) => set({ selectedDate: date }),

    openAddFood: (mealType) => set({ showAddFood: true, selectedMealType: mealType }),

    closeAddFood: () => set({ showAddFood: false, selectedMealType: null }),
}));

