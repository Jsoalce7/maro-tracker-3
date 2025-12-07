import { useMemo, useState } from 'react';
import { AddFoodModal } from '../components/nutrition/AddFoodModal';
import { EditEntryModal } from '../components/nutrition/EditEntryModal';
import { FoodDatabaseModal } from '../components/profile/FoodDatabaseModal'; // Import Manager
import { MealCard } from '../components/nutrition/MealCard';
import { DailyNutritionCard } from '../components/nutrition/DailyNutritionCard';
import { useAppStore } from '../stores/appStore';
import { useProfile } from '../hooks/useProfile';
import { useNutrition } from '../hooks/useNutrition';
import { useWater } from '../hooks/useWater';
import { MealType, FoodEntry, FoodItem } from '../types';
import { WaterModal } from '../components/nutrition/WaterModal';

export function Home() {
    // UI State
    const { showAddFood, selectedMealType, openAddFood, closeAddFood } = useAppStore();
    // Added state for meal selector
    const [showMealSelector, setShowMealSelector] = useState(false);
    const [showWaterModal, setShowWaterModal] = useState(false);
    const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
    const [manageMode, setManageMode] = useState(false);

    // Data Hooks
    const { targets } = useProfile();
    const today = new Date().toISOString().split('T')[0];
    const { dayLog, addEntry, deleteEntry, updateEntry, isLoading } = useNutrition(today);
    const { waterLogs, totalWaterMl } = useWater(today);

    // Default targets if loading
    const currentTargets = targets || {
        calories_per_day: 2000,
        protein_g: 150,
        carbs_g: 200,
        fat_g: 70,
        bmr: 0,
        tdee: 0
    };

    // Derived entries from queries
    const entries = useMemo(() => {
        const result: Record<MealType, FoodEntry[]> = {
            breakfast: [],
            lunch: [],
            dinner: [],
            snacks: [],
        };

        if (dayLog?.meals) {
            dayLog.meals.forEach(meal => {
                if (result[meal.meal_type]) {
                    result[meal.meal_type] = meal.entries || [];
                }
            });
        }
        return result;
    }, [dayLog]);

    // Calculate totals from entries
    const totals = useMemo(() => {
        const allEntries = Object.values(entries).flat();
        return {
            calories: Math.round(allEntries.reduce((sum, e) => sum + e.calories, 0)),
            protein: Math.round(allEntries.reduce((sum, e) => sum + e.protein, 0)),
            carbs: Math.round(allEntries.reduce((sum, e) => sum + e.carbs, 0)),
            fat: Math.round(allEntries.reduce((sum, e) => sum + e.fat, 0)),
            caffeine: Math.round(allEntries.reduce((sum, e) => sum + (e.caffeine_mg || 0), 0)),
            water: Math.round(totalWaterMl + allEntries.reduce((sum, e) => sum + (e.water_ml || 0), 0)),
        };
    }, [entries, totalWaterMl]);

    const getMealCalories = (mealType: MealType) => {
        return Math.round(entries[mealType].reduce((sum, e) => sum + e.calories, 0));
    };

    const isToday = (dateStr: string) => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        const local = new Date(d.getTime() - offset);
        return dateStr === local.toISOString().split('T')[0];
    };

    const handleAddFood = (
        food: FoodItem,
        quantity: number,
        unit: string,
        isCustom?: boolean,
        isRecipe?: boolean
    ) => {
        if (!selectedMealType || !dayLog) return;

        const meal = dayLog.meals.find(m => m.meal_type === selectedMealType);
        if (!meal) {
            console.error('Meal not found for type:', selectedMealType);
            return;
        }

        // Calculate Nutrition
        const ratio = quantity / 100;
        const nutrition = {
            calories: (food.calories_per_100g || 0) * ratio,
            protein: (food.protein_per_100g || 0) * ratio,
            carbs: (food.carbs_per_100g || 0) * ratio,
            fat: (food.fat_per_100g || 0) * ratio,
        };

        // Determine Caffeine
        const caffeine_mg = (food.caffeine_mg || 0) * ratio;

        // Determine Water Content (Only if explicitly Water)
        let water_ml = 0;
        if (food.category === 'Drink') {
            // Check if it's actually water
            const isWater =
                (food.tags && food.tags.includes('Water')) ||
                food.name.toLowerCase().includes('water') ||
                food.name.toLowerCase() === 'water';

            if (isWater) {
                // Convert quantity to ml
                if (unit === 'ml') water_ml = quantity;
                else if (unit === 'oz') water_ml = quantity * 29.5735;
                else water_ml = quantity; // gram approx ml
            }
        }

        addEntry({
            mealId: meal.id,
            foodId: (isCustom || isRecipe) ? undefined : food.id,
            customFoodId: (isCustom && !isRecipe) ? food.id : undefined,
            recipeId: (isRecipe) ? food.id : undefined,
            quantity: Number(quantity) || 0,
            nutrition,
            caffeine_mg,
            water_ml,
            metric_quantity: Number(quantity),
            metric_unit: unit,
        }, {
            onError: (err) => {
                console.error("Failed to add entry:", err);
                alert("Failed to add food entry. Please try again.");
            },
            onSuccess: () => {
                closeAddFood();
                setShowMealSelector(false);
            }
        });
    };

    const handleDeleteEntry = (mealType: MealType, entryIds: string[]) => {
        if (confirm('Are you sure you want to delete this entry?')) {
            entryIds.forEach(id => deleteEntry(id));
        }
    };

    // NEW handleEditEntry compatible with MealCard
    const [editingEntries, setEditingEntries] = useState<FoodEntry[] | null>(null);
    const handleEditGroup = (entries: FoodEntry[]) => {
        setEditingEntries(entries);
    };

    // ... Update Entry ...
    // ... Update Entry ...
    const handleUpdateEntry = (
        entryIds: string[],
        quantity: number,
        nutrition: { calories: number; protein: number; carbs: number; fat: number },
        logged_at?: string,
        metric_quantity?: number,
        metric_unit?: string
    ) => {
        const [firstId, ...restIds] = entryIds;
        updateEntry({
            entryId: firstId,
            quantity,
            nutrition,
            logged_at,
            metric_quantity,
            metric_unit
        }, {
            onError: (err) => { console.error("Failed to update:", err); alert("Update failed."); },
            onSuccess: () => {
                restIds.forEach(id => deleteEntry(id));
                setEditingEntries(null);
            }
        });
    };

    if (isLoading && !dayLog) {
        return <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-[#0F0F0F] p-4 space-y-4 pb-24">
            {/* Header */}
            <header className="py-2 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Today</h1>
                    <p className="text-[#6B6B6B] text-sm">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <button
                    onClick={() => setShowMealSelector(true)}
                    className="w-10 h-10 bg-[#3B82F6] rounded-full flex items-center justify-center text-white hover:bg-[#2563EB] transition-colors shadow-lg"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </header>

            {/* Daily Nutrition Card */}
            <DailyNutritionCard
                calories={{ consumed: totals.calories, target: currentTargets.calories_per_day }}
                protein={{ consumed: totals.protein, target: currentTargets.protein_g }}
                fat={{ consumed: totals.fat, target: currentTargets.fat_g }}
                carbs={{ consumed: totals.carbs, target: currentTargets.carbs_g }}
                water={totals.water}
                caffeine={totals.caffeine}
            />

            {/* Meals Section */}
            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-white">Meals</h2>
                {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map((mealType) => (
                    <MealCard
                        key={mealType}
                        type={mealType}
                        entries={entries[mealType]}
                        totalCalories={getMealCalories(mealType)}
                        onDeleteEntry={(entryIds) => handleDeleteEntry(mealType, entryIds)}
                        onEditEntry={handleEditGroup}
                    />
                ))}
            </section>

            {/* Meal Selector Modal */}
            {showMealSelector && (
                <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMealSelector(false)} />
                    <div className="relative z-10 bg-[#141414] w-full max-w-sm rounded-2xl p-5 space-y-3 border border-[#2A2A2A] animate-slide-up">
                        <h3 className="text-white font-bold text-center text-lg mb-2">Add Food</h3>
                        {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => {
                                    // Find meal by type
                                    // const meal = dayLog?.meals.find(m => m.meal_type === type);
                                    // if (meal) {
                                    openAddFood(type);
                                    // }    }
                                }}
                                className="w-full text-left p-4 rounded-xl bg-[#2A2A2A] hover:bg-[#333] transition-colors flex items-center justify-between group"
                            >
                                <span className="capitalize font-medium text-white">{type}</span>
                                <span className="text-[#6B6B6B] group-hover:text-white">+ Add</span>
                            </button>
                        ))}

                        <button
                            onClick={() => {
                                setShowWaterModal(true);
                                setShowMealSelector(false);
                            }}
                            className="w-full text-left p-4 rounded-xl bg-blue-900/20 hover:bg-blue-900/30 border border-blue-900/50 transition-colors flex items-center justify-between group mt-2"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-blue-400">💧</span>
                                <span className="font-medium text-blue-100">Log Water</span>
                            </div>
                            <span className="text-blue-400">+ Add</span>
                        </button>

                        <button
                            onClick={() => {
                                setShowMealSelector(false);
                                setManageMode(true);
                                openAddFood('snacks'); // Hack to trigger modal - generic type
                            }}
                            className="w-full text-left p-4 rounded-xl bg-[#2A2A2A] hover:bg-[#333] transition-colors flex items-center justify-between group mt-2"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-[#6B6B6B]">⚙️</span>
                                <span className="font-medium text-white">Manage Food</span>
                            </div>
                            <span className="text-[#6B6B6B] group-hover:text-white">Open</span>
                        </button>

                        <button
                            onClick={() => setShowMealSelector(false)}
                            className="w-full py-3 text-[#6B6B6B] hover:text-white font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Add Food Modal */}
            {showAddFood && (
                <AddFoodModal
                    mealType={selectedMealType || undefined}
                    onClose={() => { closeAddFood(); setManageMode(false); }}
                    onAddFood={handleAddFood}
                    mode={manageMode ? 'manage' : 'add'}
                />
            )}

            {/* Edit Entry Modal */}
            {editingEntries && (
                <EditEntryModal
                    entries={editingEntries}
                    onClose={() => setEditingEntries(null)}
                    onUpdate={handleUpdateEntry}
                    onDelete={(ids) => {
                        ids.forEach(id => deleteEntry(id));
                        setEditingEntries(null);
                    }}
                    onEditFoodData={(foodId) => setEditingFoodId(foodId)}
                />
            )}

            {editingFoodId && (
                <FoodDatabaseModal
                    initialFoodId={editingFoodId}
                    onClose={() => setEditingFoodId(null)}
                />
            )}
            {showWaterModal && (
                <WaterModal
                    date={today}
                    onClose={() => setShowWaterModal(false)}
                />
            )}
        </div>
    );
}
