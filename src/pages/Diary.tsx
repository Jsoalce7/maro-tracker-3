import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MonthCalendar } from '../components/calendar/MonthCalendar';
import { Card, CardHeader } from '../components/ui/Card';
import { MealCard } from '../components/nutrition/MealCard';
import { EditEntryModal } from '../components/nutrition/EditEntryModal';
import { FoodDatabaseModal } from '../components/profile/FoodDatabaseModal';
import { useAppStore } from '../stores/appStore';
import { useProfile } from '../hooks/useProfile'; // Used implicitly via auth store in hooks
import { useAuthStore } from '../stores/authStore';
import { useNutrition } from '../hooks/useNutrition';
import { useWater } from '../hooks/useWater';
import { supabase } from '../lib/supabase';
import { MealType, FoodEntry, FoodItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { useNavBarStore } from '../stores/navBarStore';
import { getTodayLocal } from '../utils/date';

const generateId = () => Math.random().toString(36).substr(2, 9);

export function Diary() {
    const navigate = useNavigate();
    // const { hideNavBar, showNavBar } = useNavBarStore(); // Removed: Handled by useHideNavBar hook in child components
    const { selectedDate, setSelectedDate } = useAppStore();
    const { session } = useAuthStore();
    // Added handlers for editing entries
    const [editingEntries, setEditingEntries] = useState<FoodEntry[] | null>(null);
    const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
    const [showMealSelector, setShowMealSelector] = useState(false);

    // Fetch data for selected date
    const { dayLog, deleteEntry, updateEntry, isLoading } = useNutrition(selectedDate);
    const { waterLogs, totalWaterMl } = useWater(selectedDate);

    // Open Add Food (Navigate)
    const handleOpenAddFood = (mealType: MealType) => {
        navigate(`/add-food?mealType=${mealType}&date=${selectedDate}`);
    };

    // Fetch all dates with logs for calendar
    const { data: loggedDates = [] } = useQuery({
        queryKey: ['loggedDates', session?.user?.id],
        queryFn: async () => {
            if (!session?.user?.id) return [];
            const { data } = await supabase
                .from('day_logs')
                .select('date')
                .eq('user_id', session.user.id);
            return data?.map(d => d.date) || [];
        },
        enabled: !!session?.user?.id
    });

    // Derived entries from daylog
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

    // Calculate totals for selected date
    const totals = useMemo(() => {
        const allEntries = Object.values(entries).flat();
        return {
            calories: allEntries.reduce((sum, e) => sum + e.calories, 0),
            protein: allEntries.reduce((sum, e) => sum + e.protein, 0),
            carbs: allEntries.reduce((sum, e) => sum + e.carbs, 0),
            fat: allEntries.reduce((sum, e) => sum + e.fat, 0),
            caffeine: allEntries.reduce((sum, e) => sum + (e.caffeine_mg || 0), 0),
            water: totalWaterMl + allEntries.reduce((sum, e) => sum + (e.water_ml || 0), 0),
        };
    }, [entries, totalWaterMl]);

    const getMealCalories = (mealType: MealType) => {
        return entries[mealType].reduce((sum, e) => sum + e.calories, 0);
    };

    const formatSelectedDate = () => {
        // ... (existing logic)
        const date = new Date(selectedDate);
        const today = getTodayLocal();
        if (selectedDate === today) return 'Today';
        return date.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        });
    };

    const openAddFood = (mealType: MealType) => {
        // Navigate to new Add Food Page
        navigate(`/add-food?mealType=${mealType}`);
        // Reset local state if needed (most is removed now)
        setShowMealSelector(false);
    };

    const handleDeleteEntry = (mealType: MealType, entryIds: string[]) => {
        if (confirm('Are you sure you want to delete this entry?')) {
            entryIds.forEach(id => deleteEntry(id));
        }
    };

    const handleEditEntry = (entries: FoodEntry[]) => {
        setEditingEntries(entries);
    };

    // Update handler for grouped entries
    const handleUpdateEntry = (
        entryIds: string[],
        quantity: number,
        nutrition: { calories: number; protein: number; carbs: number; fat: number },
        logged_at?: string,
        metric_quantity?: number,
        metric_unit?: string
    ) => {
        // 1. Update the first entry
        const [firstId, ...restIds] = entryIds;
        updateEntry({
            entryId: firstId,
            quantity,
            nutrition,
            logged_at,
            metric_quantity,
            metric_unit
        }, {
            onError: (err) => { console.error("Failed to update entry:", err); alert("Failed to update."); },
            onSuccess: () => {
                // 2. Delete the rest
                restIds.forEach(id => deleteEntry(id));
                setEditingEntries(null);
            }
        });
    };

    return (
        <div className="min-h-screen bg-[#050505] page-container pb-32">
            {/* Header */}
            <header className="px-4 py-2 mb-3 flex items-center justify-between safe-top">
                <div>
                    <h1 className="text-2xl font-bold text-white">Diary</h1>
                    <p className="text-[#6B6B6B] text-sm">View and edit past entries</p>
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

            {/* Responsive Layout */}
            <div className="flex flex-col sm:flex-row sm:gap-4 lg:gap-6 sm:items-start">
                <div className="sm:w-64 md:w-72 lg:w-80 sm:flex-shrink-0 mb-4 sm:mb-0 sm:sticky sm:top-4">
                    <MonthCalendar
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        loggedDates={loggedDates}
                    />
                </div>

                <div className="flex-1 space-y-4">
                    <Card>
                        <CardHeader
                            title={formatSelectedDate()}
                            subtitle={selectedDate}
                        />
                        {/* Quick Stats - kept same */}
                        <div className="grid grid-cols-4 gap-2 mt-3">
                            <div className="bg-[#141414] rounded-lg p-2 text-center">
                                <p className="text-base font-bold text-[#3B82F6]">{Math.round(totals.calories)}</p>
                                <p className="text-[10px] text-[#6B6B6B]">kcal</p>
                            </div>
                            <div className="bg-[#141414] rounded-lg p-2 text-center">
                                <p className="text-base font-bold text-[#EF4444]">{Math.round(totals.protein)}g</p>
                                <p className="text-[10px] text-[#6B6B6B]">Protein</p>
                            </div>
                            <div className="bg-[#141414] rounded-lg p-2 text-center">
                                <p className="text-base font-bold text-[#10B981]">{Math.round(totals.carbs)}g</p>
                                <p className="text-[10px] text-[#6B6B6B]">Carbs</p>
                            </div>
                            <div className="bg-[#141414] rounded-lg p-2 text-center">
                                <p className="text-base font-bold text-[#F59E0B]">{Math.round(totals.fat)}g</p>
                                <p className="text-[10px] text-[#6B6B6B]">Fat</p>
                            </div>
                        </div>
                        {/* Secondary Stats */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="bg-[#141414] rounded-lg p-2 flex justify-between items-center px-4 border border-[#2A2A2A]">
                                <div className="text-[10px] text-[#6B6B6B]">Water</div>
                                <div className="text-sm font-bold text-blue-400">{Math.round(totals.water)}ml</div>
                            </div>
                            <div className="bg-[#141414] rounded-lg p-2 flex justify-between items-center px-4 border border-[#2A2A2A]">
                                <div className="text-[10px] text-[#6B6B6B]">Caffeine</div>
                                <div className="text-sm font-bold text-amber-500">{Math.round(totals.caffeine)}mg</div>
                            </div>
                        </div>
                    </Card>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-white">Meals</h2>
                        {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map((mealType) => (
                            entries[mealType].length > 0 && (
                                <MealCard
                                    key={mealType}
                                    type={mealType}
                                    entries={entries[mealType]}
                                    totalCalories={getMealCalories(mealType)}
                                    onDeleteEntry={(entryIds) => handleDeleteEntry(mealType, entryIds)}
                                    onEditEntry={handleEditEntry}
                                />
                            )
                        ))}
                    </section>
                </div>
            </div>

            {/* Meal Selector Modal */}
            {showMealSelector && (
                <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMealSelector(false)} />
                    <div className="relative z-10 bg-[#141414] w-full max-w-sm rounded-2xl p-5 space-y-3 border border-[#2A2A2A] animate-slide-up">
                        <h3 className="text-white font-bold text-center text-lg mb-2">Add Food</h3>
                        {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => openAddFood(type)}
                                className="w-full text-left p-4 rounded-xl bg-[#2A2A2A] hover:bg-[#333] transition-colors flex items-center justify-between group"
                            >
                                <span className="capitalize font-medium text-white">{type}</span>
                                <span className="text-[#6B6B6B] group-hover:text-white">+ Add</span>
                            </button>
                        ))}

                        <button
                            onClick={() => {
                                setShowMealSelector(false);
                                navigate('/log-water');
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
                                navigate('/add-food?mode=manage');
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

            {/* Note: AddFoodModal, WaterModal, and FoodDatabaseModal are REMOVED entirely. */}
            {/* They are replaced by routes: /add-food, /log-water */}

            {/* Edit Entry Modal - Kept as a modal for now as it's a small edit? Or should this be a page too? */}
            {/* User prompt: "Edit Entry Modal" wasn't explicitly listed in the "Move to no-nav layout" section, but: */}
            {/* "Any other step in the 'add food / add water' flow... " */}
            {/* Editing an entry is technically part of "Diary management". */}
            {/* However, the user said "Add Food sheet... Add to Breakfast... Manage Food". */}
            {/* I'll keep Edit Entry as Modal for now to minimize risk, but might need to hide Nav if it's large. */}
            {/* Actually, user said "Global nav rules... Bottom nav should be HIDDEN on ... Any other step in the 'add food' flow". */}
            {/* Let's double check if EditEntry needs hiding. It currently uses useHideNavBar. Since it's inside Diary (Page with Nav), we might have an issue. */}
            {/* But wait, simple modals can overlay. The issue was FULL SCREEN flows. */}
            {/* If Edit Entry is a small popup, it's fine. If it's a full screen sheet, it might cover nav. */}
            {/* The EditEntryModal currently uses `useHideNavBar`. But since we are removing the `AppShell` logic for hiding, `useHideNavBar` will stop working if we delete that logic. */}
            {/* However, `AppShell` renders `BottomNav`. If we stay on `/diary`, `AppShell` is present. */}
            {/* So `EditEntryModal` will still need to hide Nav if it overlaps. */}
            {/* BUT, the user said "centralize decision... separate layouts". */}
            {/* Ideally, Edit Entry is also a Page or a Modal that doesn't conflict. */}
            {/* For now I will leave EditEntry as is, but remove the unused Modal imports. */}

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
                    onEditFoodData={(foodId) => {
                        setEditingFoodId(foodId);
                    }}
                />
            )}

            {editingFoodId && (
                <FoodDatabaseModal
                    initialFoodId={editingFoodId}
                    onClose={() => {
                        setEditingFoodId(null);
                    }}
                />
            )}
        </div>
    );
}

