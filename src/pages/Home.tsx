import { useMemo, useState } from 'react';
import { EditEntryModal } from '../components/nutrition/EditEntryModal';
import { GlobalActionModal } from '../components/navigation/GlobalActionModal';
import { CompactMealCard } from '../components/nutrition/CompactMealCard';
import { DailyNutritionCard } from '../components/nutrition/DailyNutritionCard';
import { CompactWeightCard } from '../components/weight/CompactWeightCard';
import { DiaryMedicationCard } from '../components/diary/DiaryMedicationCard';
import { useAppStore } from '../stores/appStore';
import { useProfile } from '../hooks/useProfile';
import { useNutrition } from '../hooks/useNutrition';
import { useWater } from '../hooks/useWater';
import { MealType, FoodEntry, FoodItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { getTodayLocal, formatDateDisplay } from '../utils/date';

export function Home() {
    const navigate = useNavigate();

    const mealLabels: Record<MealType, string> = {
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner',
        snacks: 'Snacks',
    };

    // Added state for meal selector
    const [showMealSelector, setShowMealSelector] = useState(false);

    // Data Hooks
    const { targets } = useProfile();
    const today = getTodayLocal();
    const { dayLog, addEntry, deleteEntry, updateEntry, moveEntry, isLoading } = useNutrition(today);
    const { waterLogs, totalWaterMl } = useWater(today);

    // Open Add Food (Navigate)
    const handleOpenAddFood = (mealType: MealType) => {
        // hideNavBar(); // Removed: Handled by Layout
        // openAddFood(mealType); // Removed: Store state no longer needed
        navigate(`/add-food?mealType=${mealType}&date=${today}`);
    };

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
            quantity: quantity, // This is quantity_g passed from EditEntryModal
            nutrition,
            metric_quantity: metric_quantity,
            metric_unit: metric_unit
        }, {
            onError: (err) => { console.error("Failed to update:", err); alert("Update failed."); },
            onSuccess: () => {
                restIds.forEach(id => deleteEntry(id));
                setEditingEntries(null);
            }
        });
    };

    const handleMoveEntry = (entryIds: string[], targetMealType: MealType) => {
        const targetMeal = dayLog?.meals.find(m => m.meal_type === targetMealType);
        if (targetMeal) {
            moveEntry({ entryIds, targetMealId: targetMeal.id });
        } else {
            console.error("Target meal not found:", targetMealType);
            alert("Could not move items. Target meal does not exist.");
        }
    };

    const handleSaveAsMyMeal = (entries: FoodEntry[], sourceMealType: MealType) => {
        // Prepare entries for CreateRecipe
        // We pass the raw entries, CreateRecipe will map them
        navigate('/create-recipe', {
            state: {
                fromMeal: entries,
                defaultName: `${mealLabels[sourceMealType]} - ${formatDateDisplay(today)}`
            }
        });
    };

    if (isLoading && !dayLog) {
        return <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-[#050505] page-container">
            {/* Header */}
            <header className="py-2 px-4 flex items-center justify-between safe-top">
                <div>
                    <h1 className="text-2xl font-bold text-white">Today</h1>
                    <p className="text-[#6B6B6B] text-sm">
                        {formatDateDisplay(today)}
                    </p>
                </div>
                <button
                    onClick={() => {
                        // hideNavBar(); // Removed
                        setShowMealSelector(true);
                    }}
                    className="w-10 h-10 bg-[#3B82F6] rounded-full flex items-center justify-center text-white hover:bg-[#2563EB] transition-colors shadow-lg"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </header>

            {/* Main Content */}
            <div className="px-4 pb-32">
                {/* Responsive Grid: 1 Col on Mobile, 2 Cols on Tablet+ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* LEFT COLUMN: Daily Stats + Meals */}
                    <div className="space-y-6">
                        {/* 1. Daily Nutrition Card */}
                        <DailyNutritionCard
                            calories={{ consumed: totals.calories, target: currentTargets.calories_per_day }}
                            protein={{ consumed: totals.protein, target: currentTargets.protein_g }}
                            fat={{ consumed: totals.fat, target: currentTargets.fat_g }}
                            carbs={{ consumed: totals.carbs, target: currentTargets.carbs_g }}
                            water={totals.water}
                            caffeine={totals.caffeine}
                        />

                        {/* 2. Meals Section */}
                        <section className="space-y-3">
                            <h2 className="text-lg font-semibold text-white">Meals</h2>

                            {/* Meals Grid: 2x2 on all screens */}
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map((mealType) => (
                                    <CompactMealCard
                                        key={mealType}
                                        type={mealType}
                                        entries={entries[mealType]}
                                        totalCalories={getMealCalories(mealType)}
                                        onDeleteEntry={(entryIds) => handleDeleteEntry(mealType, entryIds)}
                                        onEditEntry={handleEditGroup}
                                        onMoveEntry={handleMoveEntry}
                                        onSaveAsMyMeal={(entries) => handleSaveAsMyMeal(entries, mealType)}
                                    />
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: Weight + Medications (Hidden on Mobile) */}
                    <div className="hidden md:flex flex-col gap-6">
                        <CompactWeightCard />
                        <DiaryMedicationCard
                            date={today}
                            onManage={() => navigate('/medications')}
                        />
                    </div>

                </div>
            </div>

            {/* Global Action Modal */}
            {showMealSelector && (
                <GlobalActionModal
                    onClose={() => setShowMealSelector(false)}
                    onStartWorkout={() => {
                        setShowMealSelector(false);
                        // Logic to start workout or navigate
                        navigate('/workout/session/new'); // Placeholder, adjust if needed
                    }}
                    onManageWorkouts={() => {
                        setShowMealSelector(false);
                        navigate('/add-food?mode=manage'); // Placeholder based on old logic? No, wait.
                        // The old modal had "Manage Food" -> /add-food?mode=manage.
                        // GlobalActionModal has "Manage Workouts" -> /workout-manager (implied).
                        // Let's wire it correctly.
                        navigate('/workouts');
                    }}
                    onManageMedications={() => {
                        setShowMealSelector(false);
                        navigate('/medications');
                    }}
                />
            )}

            {/* Note: AddFoodModal, WaterModal etc REMOVED. */}

            {/* Edit Entry Modal - Kept for now */}
            {editingEntries && (
                <EditEntryModal
                    entries={editingEntries}
                    onClose={() => setEditingEntries(null)}
                    onUpdate={handleUpdateEntry}
                    onDelete={(ids) => {
                        ids.forEach(id => deleteEntry(id));
                        setEditingEntries(null);
                    }}
                />
            )}
        </div>
    );
}
