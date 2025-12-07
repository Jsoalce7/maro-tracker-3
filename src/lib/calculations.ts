import { ACTIVITY_MULTIPLIERS, GOAL_ADJUSTMENTS, UserProfile, UserTargets } from '../types';

/**
 * Calculate BMI (Body Mass Index)
 * Formula: weight (kg) / height (m)²
 */
export function calculateBMI(weight_kg: number, height_cm: number): number {
    const height_m = height_cm / 100;
    return weight_kg / (height_m * height_m);
}

/**
 * Calculate BMR using Mifflin-St Jeor Equation
 * Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) + 5
 * Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) - 161
 */
export function calculateBMR(profile: UserProfile): number {
    const base = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age;
    return profile.sex === 'male' ? base + 5 : base - 161;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * Formula: BMR × Activity Multiplier
 */
export function calculateTDEE(bmr: number, activity_level: UserProfile['activity_level']): number {
    return bmr * ACTIVITY_MULTIPLIERS[activity_level];
}

/**
 * Calculate daily calorie target based on goal
 */
export function calculateDailyCalories(tdee: number, goal_type: UserProfile['goal_type']): number {
    return Math.round(tdee + GOAL_ADJUSTMENTS[goal_type]);
}

/**
 * Calculate macro targets based on daily calories
 * Default split: 30% protein, 30% fat, 40% carbs
 */
export function calculateMacroTargets(calories: number): Pick<UserTargets, 'protein_g' | 'carbs_g' | 'fat_g'> {
    // Calories per gram: Protein 4, Carbs 4, Fat 9
    const protein_calories = calories * 0.3;
    const fat_calories = calories * 0.3;
    const carbs_calories = calories * 0.4;

    return {
        protein_g: Math.round(protein_calories / 4),
        fat_g: Math.round(fat_calories / 9),
        carbs_g: Math.round(carbs_calories / 4),
    };
}

/**
 * Generate complete user targets from profile
 */
export function generateUserTargets(profile: UserProfile): Omit<UserTargets, 'id' | 'user_id'> {
    const bmr = calculateBMR(profile);
    const tdee = calculateTDEE(bmr, profile.activity_level);

    if (profile.use_custom_targets) {
        return {
            bmr: Math.round(bmr),
            tdee: Math.round(tdee),
            calories_per_day: profile.custom_calories || 2000,
            protein_g: profile.custom_protein || 150,
            fat_g: profile.custom_fat || 70,
            carbs_g: profile.custom_carbs || 200,
        };
    }

    const calories_per_day = calculateDailyCalories(tdee, profile.goal_type);
    const macros = calculateMacroTargets(calories_per_day);

    return {
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        calories_per_day,
        ...macros,
    };
}

/**
 * Calculate nutrition from food entry
 */
export function calculateEntryNutrition(
    food: { calories_per_100g: number; protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number },
    quantity_g: number
) {
    const multiplier = quantity_g / 100;
    return {
        calories: Math.round(food.calories_per_100g * multiplier),
        protein: Math.round(food.protein_per_100g * multiplier * 10) / 10,
        carbs: Math.round(food.carbs_per_100g * multiplier * 10) / 10,
        fat: Math.round(food.fat_per_100g * multiplier * 10) / 10,
    };
}

/**
 * Format number with unit
 */
export function formatWithUnit(value: number, unit: string, decimals = 0): string {
    // Round to specified decimals and strip trailing zeros
    const rounded = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    return `${rounded}${unit}`;
}

/**
 * Get percentage (capped at 100)
 */
export function getPercentage(consumed: number, target: number): number {
    if (target === 0) return 0;
    return Math.min(100, Math.round((consumed / target) * 100));
}
