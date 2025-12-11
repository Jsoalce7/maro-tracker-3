import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MonthCalendar } from '../components/calendar/MonthCalendar';
import { Card, CardHeader } from '../components/ui/Card';
import { MealCard } from '../components/nutrition/MealCard';
import { EditEntryModal } from '../components/nutrition/EditEntryModal';
import { useAppStore } from '../stores/appStore';
import { useProfile } from '../hooks/useProfile';
import { useAuthStore } from '../stores/authStore';
import { useNutrition } from '../hooks/useNutrition';
import { useWater } from '../hooks/useWater';
import { supabase } from '../lib/supabase';
import { MealType, FoodEntry, FoodItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { getTodayLocal } from '../utils/date';
import { CompactWeightCard } from '../components/weight/CompactWeightCard';
import { CompactMealCard } from '../components/nutrition/CompactMealCard';
import { DiaryMealsSummaryCard } from '../components/diary/DiaryMealsSummaryCard';
import { DiaryWorkoutCard } from '../components/diary/DiaryWorkoutCard';
import { DiaryMedicationCard } from '../components/diary/DiaryMedicationCard';
import { DiaryVitalsCard } from '../components/diary/DiaryVitalsCard';
import { CardDetailModal } from '../components/diary/CardDetailModal';

// New Imports
import { GlobalActionModal } from '../components/navigation/GlobalActionModal';
import { StartWorkoutModal } from '../components/workout/StartWorkoutModal';
import { WorkoutManager } from '../components/workout/WorkoutManager';
import { workoutService } from '../services/workoutService';


const generateId = () => Math.random().toString(36).substr(2, 9);

export function Diary() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { selectedDate, setSelectedDate } = useAppStore();
    const { session } = useAuthStore();
    // Added handlers for editing entries
    const [editingEntries, setEditingEntries] = useState<FoodEntry[] | null>(null);
    const [showMealSelector, setShowMealSelector] = useState(false);

    // New Modal States
    const [showStartWorkout, setShowStartWorkout] = useState(false);
    const [showWorkoutManager, setShowWorkoutManager] = useState(false);

    // Fetch profile targets
    const { targets } = useProfile();
    const currentTargets = targets || {
        calories_per_day: 2000,
        protein_g: 150,
        carbs_g: 200,
        fat_g: 70,
        bmr: 0,
        tdee: 0
    };
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

    // Fetch active session for Modal Logic
    const { data: workoutData = { sessions: [], scheduled: [] } } = useQuery({
        queryKey: ['workouts', selectedDate, session?.user?.id],
        queryFn: () => {
            if (!session?.user?.id) return { sessions: [], scheduled: [] };
            return workoutService.getWorkoutsForDate(session.user.id, selectedDate);
        },
        enabled: !!session?.user?.id
    });
    const activeSession = workoutData.sessions[0]; // For passing to modals


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

    // State for Meal Row Visibility (Persistent)
    const [showMeals, setShowMeals] = useState(() => {
        const saved = localStorage.getItem('diaryMealsCollapsed');
        // Default to true (expanded) if not set or if set to 'false' (meaning NOT collapsed, so expanded)
        // User logic: "diaryMealsCollapsed = true/false".
        // If key exists and is 'true', then we are collapsed (showMeals = false).
        // If key is 'false' or missing, we are expanded (showMeals = true).
        if (saved === 'true') return false;
        return true;
    });

    useEffect(() => {
        localStorage.setItem('diaryMealsCollapsed', (!showMeals).toString());
    }, [showMeals]);

    // Detail State for Mobile/Tablet
    const [activeDetail, setActiveDetail] = useState<'meals' | 'workout' | 'medication' | 'vitals' | null>(null);

    // --- Components Pre-Instantiated (Reuse) ---
    // We create "Compact" versions (with override) and "Standard" versions/Modal versions (forced expanded)

    // 1. Config for "Click to Expand" behavior (Mobile/Tablet)
    const handleCardClick = (type: 'meals' | 'workout' | 'medication' | 'vitals') => {
        // Only trigger modal on non-desktop (we'll control this via layout visibility, 
        // effectively we render the "Compact" card which has the override on smaller screens).
        setActiveDetail(type);
    };

    // Card Instances

    // A. Components for Dashboard (Desktop) & Modal (Detail)
    // - Desktop: Standard behavior (collapsible internally, starts expanded/collapsed based on persistent state) OR always expanded?
    // User said: "Desktop ... keep current behavior (expanded card in place)". So undefined forceExpanded.

    // B. Components for Mobile/Tablet Grid (Compacts)
    // - Force collapsed (visually compact)? Actually user said "Compact mode by default: show title... do NOT render full details".
    // Since our cards "Collapsed" state IS the compact view, we just need to ensure they start collapsed and toggle opens modal.
    // We pass `forceExpanded={false}` to force them to STAY collapsed visually, and `onClickOverride` to open modal.

    // Let's render the specific layouts directly in the JSX to keep it clear.

    return (
        <div className="min-h-screen bg-[#050505] page-container pb-32">
            {/* Header */}
            <header className="px-4 md:px-6 py-2 mb-3 flex items-center justify-between safe-top">
                <div>
                    <h1 className="text-2xl font-bold text-white">Diary</h1>
                    <p className="text-[#6B6B6B] text-sm">View and edit today's logs</p>
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

            <div className="px-4 md:px-6">

                {/* --- LAYOUT 1: Mobile Stack (<768px) --- */}
                <div className="block md:hidden space-y-4">
                    {/* 1. Calendar + Weight (Top on Mobile) */}
                    <Card className="p-4"><MonthCalendar selectedDate={selectedDate} onSelectDate={(date) => { setSelectedDate(date); navigate(`/diary?date=${date}`); }} loggedDates={loggedDates} /></Card>
                    <CompactWeightCard />

                    {/* 2. Summaries */}
                    <DiaryMealsSummaryCard
                        entries={entries} totals={totals}
                        targets={{ calories: currentTargets.calories_per_day, protein: currentTargets.protein_g, carbs: currentTargets.carbs_g, fat: currentTargets.fat_g }}
                        onDeleteEntry={handleDeleteEntry} onEditEntry={handleEditEntry}
                        forceExpanded={false}
                        onClickOverride={() => setActiveDetail('meals')}
                    />
                    <DiaryWorkoutCard date={selectedDate} forceExpanded={false} onClickOverride={() => setActiveDetail('workout')} />
                    <DiaryMedicationCard date={selectedDate} forceExpanded={false} onClickOverride={() => setActiveDetail('medication')} />
                    <DiaryVitalsCard date={selectedDate} forceExpanded={false} onClickOverride={() => setActiveDetail('vitals')} />
                </div>

                {/* --- LAYOUT 2: Tablet / Small Desktop (768px - 1100px) --- */}
                <div className="hidden md:grid lg:hidden grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Col 1: Calendar + Weight */}
                    <div className="col-span-1 space-y-6">
                        <Card className="p-4"><MonthCalendar selectedDate={selectedDate} onSelectDate={(date) => { setSelectedDate(date); navigate(`/diary?date=${date}`); }} loggedDates={loggedDates} /></Card>
                        <CompactWeightCard />
                    </div>
                    {/* Col 2 (Span 2): Vertical Stack of Summary Cards */}
                    <div className="col-span-2 flex flex-col gap-4">
                        <DiaryMealsSummaryCard
                            entries={entries} totals={totals}
                            targets={{ calories: currentTargets.calories_per_day, protein: currentTargets.protein_g, carbs: currentTargets.carbs_g, fat: currentTargets.fat_g }}
                            onDeleteEntry={handleDeleteEntry} onEditEntry={handleEditEntry}
                            forceExpanded={false}
                            onClickOverride={() => setActiveDetail('meals')}
                        />
                        <DiaryWorkoutCard date={selectedDate} forceExpanded={false} onClickOverride={() => setActiveDetail('workout')} />
                        <DiaryMedicationCard date={selectedDate} forceExpanded={false} onClickOverride={() => setActiveDetail('medication')} />
                        <DiaryVitalsCard date={selectedDate} forceExpanded={false} onClickOverride={() => setActiveDetail('vitals')} />
                    </div>
                </div>

                {/* --- LAYOUT 3: Large Desktop (>= 1100px) --- */}
                <div className="hidden lg:grid grid-cols-3 gap-6">
                    {/* Col 1: Calendar + Weight */}
                    <div className="space-y-6">
                        <Card className="p-4"><MonthCalendar selectedDate={selectedDate} onSelectDate={(date) => { setSelectedDate(date); navigate(`/diary?date=${date}`); }} loggedDates={loggedDates} /></Card>
                        <CompactWeightCard />
                    </div>
                    {/* Col 2: Meals + Meds */}
                    <div className="space-y-6">
                        <DiaryMealsSummaryCard
                            entries={entries} totals={totals}
                            targets={{ calories: currentTargets.calories_per_day, protein: currentTargets.protein_g, carbs: currentTargets.carbs_g, fat: currentTargets.fat_g }}
                            onDeleteEntry={handleDeleteEntry} onEditEntry={handleEditEntry}
                        // Default behavior (internal state)
                        />
                        <DiaryMedicationCard date={selectedDate} />
                    </div>
                    {/* Col 3: Workout + Vitals */}
                    <div className="space-y-6">
                        <DiaryWorkoutCard date={selectedDate} />
                        <DiaryVitalsCard date={selectedDate} />
                    </div>
                </div>

            </div>


            {/* --- Modals and Overlays --- */}

            {/* Global Action Modal (FAB) */}
            {showMealSelector && (
                <GlobalActionModal
                    onClose={() => setShowMealSelector(false)}
                    onStartWorkout={() => {
                        setShowMealSelector(false); // Close parent
                        setShowStartWorkout(true);  // Open Start Modal
                    }}
                    onManageWorkouts={() => {
                        setShowMealSelector(false);
                        setShowWorkoutManager(true);
                    }}
                />
            )}

            {/* Start Workout Modal */}
            {showStartWorkout && (
                <StartWorkoutModal
                    onClose={() => setShowStartWorkout(false)}
                    currentSession={activeSession}
                    onStart={async (templateId) => {
                        try {
                            if (templateId) {
                                const { session: newSession } = await workoutService.startWorkoutFromTemplate(session!.user!.id, templateId);
                                navigate(`/workout/session/${newSession.id}`);
                            } else {
                                const newSession = await workoutService.startEmptySession(session!.user!.id);
                                navigate(`/workout/session/${newSession.id}`);
                            }
                        } catch (e) { console.error(e); alert("Failed to start workout"); }
                    }}
                    onManage={() => {
                        setShowStartWorkout(false);
                        setShowWorkoutManager(true);
                    }}
                    onResume={() => {
                        if (activeSession) navigate(`/workout/session/${activeSession.id}`);
                    }}
                    onEndSession={async () => {
                        if (!activeSession) return;
                        await workoutService.completeWorkout(activeSession.id);
                        queryClient.invalidateQueries({ queryKey: ['workouts'] });
                        setShowStartWorkout(false);
                    }}
                />
            )}

            {/* Workout Manager */}
            {showWorkoutManager && (
                <WorkoutManager onClose={() => setShowWorkoutManager(false)} />
            )}


            {/* Detail Modal for Mobile/Tablet */}
            {activeDetail && (
                <CardDetailModal onClose={() => setActiveDetail(null)}>
                    {activeDetail === 'meals' && (
                        <DiaryMealsSummaryCard
                            entries={entries} totals={totals}
                            targets={{ calories: currentTargets.calories_per_day, protein: currentTargets.protein_g, carbs: currentTargets.carbs_g, fat: currentTargets.fat_g }}
                            onDeleteEntry={handleDeleteEntry} onEditEntry={handleEditEntry}
                            forceExpanded={true}
                        />
                    )}
                    {activeDetail === 'workout' && <DiaryWorkoutCard date={selectedDate} forceExpanded={true} />}
                    {activeDetail === 'medication' && <DiaryMedicationCard date={selectedDate} forceExpanded={true} />}
                    {activeDetail === 'vitals' && <DiaryVitalsCard date={selectedDate} forceExpanded={true} />}
                </CardDetailModal>
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
                />
            )}


        </div>
    );
}
