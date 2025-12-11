// Weight Tracking
export interface WeightLog {
    id: string;
    user_id: string;
    date: string; // ISO date string YYYY-MM-DD
    weight_lb: number;
    source: string;
    created_at: string;
    updated_at?: string;
}

// User & Profile Types
export interface UserProfile {
    id: string;
    height_cm: number;
    weight_kg: number;
    goal_weight_kg: number;
    age: number;
    sex: 'male' | 'female';
    activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
    goal_type: 'lose' | 'maintain' | 'gain';

    // Custom Targets (Override)
    use_custom_targets?: boolean;
    custom_calories?: number;
    custom_protein?: number;
    custom_carbs?: number;
    custom_fat?: number;
}

export interface UserTargets {
    id: string;
    user_id: string;
    calories_per_day: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    bmr: number;
    tdee: number;
}

// Food & Nutrition Types
export interface FoodItem {
    id: string;
    name: string;
    brand?: string;
    barcode?: string;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    // Micros (Optional)
    sugar_per_100g?: number;
    fiber_per_100g?: number;
    saturated_fat_per_100g?: number;
    sodium_per_100g?: number; // mg
    caffeine_mg?: number;     // mg (per 100g/ml usually, or absolute per serving if unit is handled)

    serving_size_g: number;
    serving_unit?: string; // e.g. "slice", "cup", "oz"

    // Metadata
    category?: string; // 'Meal', 'Snack', 'Drink', etc.
    ingredient_type?: string; // 'Protein', 'Dairy', 'Carbs', etc.
    source?: string;   // 'Home-cooked', 'Restaurant', etc.
    processing_level?: string; // 'Whole food', 'Ultra processed'
    tags?: string[];   // ['High protein', 'Keto']
    restaurant?: string; // 'McDonalds', 'In-N-Out'
}

export interface FoodEntry {
    id: string;
    meal_id: string;
    food_id?: string;
    custom_food_id?: string;

    // Join fields (optional)
    food?: FoodItem;
    custom_food?: FoodItem;

    quantity_g: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;

    // Log time
    logged_at?: string; // ISO string

    // New Fields
    caffeine_mg?: number;
    water_ml?: number;
    metric_quantity?: number; // e.g. 1.5
    metric_unit?: string;     // e.g. 'cup'

    recipe_id?: string;
    recipe?: Recipe;
}

export interface Recipe {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    servings_per_recipe: number;
    serving_unit: string;
    ingredients?: RecipeIngredient[];

    // Metadata
    category?: string;
    source?: string;
    processing_level?: string;
    tags?: string[];
    restaurant?: string;
}

export interface RecipeIngredient {
    id: string;
    recipe_id: string;
    food_id?: string;
    custom_food_id?: string;
    food?: FoodItem; // Joined
    quantity: number; // Amount of the food used
    unit: string;
    display_order: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface Meal {
    id: string;
    day_log_id: string;
    meal_type: MealType;
    entries: FoodEntry[];
}

export interface DayLog {
    id: string;
    user_id: string;
    date: string; // ISO date string YYYY-MM-DD
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    total_caffeine_mg?: number;
    total_water_ml?: number;
    meals: Meal[];
}

// UI Types
export interface MacroData {
    consumed: number;
    target: number;
    label: string;
    color: 'protein' | 'fat' | 'carbs' | 'calories';
}

export interface NutritionSummary {
    calories: MacroData;
    protein: MacroData;
    carbs: MacroData;
    fat: MacroData;
}

// Activity Level Multipliers for TDEE
export const ACTIVITY_MULTIPLIERS: Record<UserProfile['activity_level'], number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
};

// Goal Adjustments (calories)
export const GOAL_ADJUSTMENTS: Record<UserProfile['goal_type'], number> = {
    lose: -500,
    maintain: 0,
    gain: 500,
};
