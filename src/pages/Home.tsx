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
import { useAuthStore } from '../stores/authStore';
import { useQuery } from '@tanstack/react-query';

export function Home() {
    const navigate = useNavigate();
    const { session } = useAuthStore();

    const mealLabels: Record<MealType, string> = {
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner',
        snacks: 'Snacks',
    };

    // Data Hooks
    // Data Hooks
    const { targets } = useProfile();
    const today = getTodayLocal();
    const { dayLog, addEntry, deleteEntry, updateEntry, moveEntry, isLoading } = useNutrition(today);
    const { waterLogs, totalWaterMl } = useWater(today);

    // Open Add Food (Navigate)
    const handleOpenAddFood = (mealType: MealType) => {
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
            netCarbs: Math.round(allEntries.reduce((sum, e) => sum + (e.net_carbs_g ?? e.carbs), 0)),
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
        metric_unit?: string,
        fiber_g?: number,
        sugar_alcohols_g?: number,
        net_carbs_g?: number
    ) => {
        const [firstId, ...restIds] = entryIds;
        updateEntry({
            entryId: firstId,
            quantity: quantity, // This is quantity_g passed from EditEntryModal
            nutrition,
            metric_quantity: metric_quantity,
            metric_unit: metric_unit,
            fiber_g,
            sugar_alcohols_g,
            net_carbs_g
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
                            carbs={{ consumed: totals.carbs, netConsumed: totals.netCarbs, target: currentTargets.carbs_g }}
                            water={totals.water}
                            caffeine={totals.caffeine}
                        />

                        {/* 2. Meals Section */}
                        <section className="space-y-3">
                            <h2 className="text-lg font-semibold text-white">Meals</h2>

                            {/* Meals Grid: Single col on mobile, 2 cols on Tablet+ */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[])
                                    .filter(type => entries[type].length > 0) // Hide empty meals
                                    .map((mealType) => (
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
                                {Object.values(entries).every(e => e.length === 0) && (
                                    <div className="col-span-full py-8 text-center text-[#444] text-sm italic border border-dashed border-[#222] rounded-2xl">
                                        No meals logged today
                                    </div>
                                )}
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

            {/* Edit Entry Modal - Kept local */}
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
