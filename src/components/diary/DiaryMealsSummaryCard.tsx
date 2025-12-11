import { useState, useEffect } from 'react';
import { MealType, FoodEntry } from '../../types';
import { CompactMealCard } from '../nutrition/CompactMealCard';

interface DiaryMealsSummaryCardProps {
    entries: Record<MealType, FoodEntry[]>;
    totals: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
    targets: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
    onDeleteEntry?: (mealType: MealType, entryIds: string[]) => void;
    onEditEntry?: (entries: FoodEntry[]) => void;
    forceExpanded?: boolean;
    onClickOverride?: () => void;
}

export function DiaryMealsSummaryCard({
    entries,
    totals,
    targets,
    onDeleteEntry,
    onEditEntry,
    forceExpanded,
    onClickOverride
}: DiaryMealsSummaryCardProps) {
    const [isExpandedLocal, setIsExpandedLocal] = useState(false);

    // Persistence with local override
    useEffect(() => {
        const saved = localStorage.getItem('diaryMealsSummaryExpanded');
        if (saved) setIsExpandedLocal(saved === 'true');
    }, []);

    const isExpanded = forceExpanded !== undefined ? forceExpanded : isExpandedLocal;

    const toggleExpanded = () => {
        if (onClickOverride) {
            onClickOverride();
            return;
        }
        const newState = !isExpandedLocal;
        setIsExpandedLocal(newState);
        localStorage.setItem('diaryMealsSummaryExpanded', newState.toString());
    };

    // --- Helpers ---
    const getMealCalories = (type: MealType) => Math.round(entries[type].reduce((sum, e) => sum + e.calories, 0));
    const getMealItemCount = (type: MealType) => entries[type].length;

    // Status Pill Logic (Front-end only stub)
    const getStatus = () => {
        if (totals.calories > targets.calories) return { label: 'Over Target', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
        if (totals.calories > 0 && totals.calories <= targets.calories) return { label: 'On Track', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
        return { label: 'Incomplete', color: 'text-[#8E8E93] bg-[#2A2A2A] border-[#333]' };
    };

    const status = getStatus();

    // Footer Logic
    const mealsLoggedCount = (['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).filter(t => getMealCalories(t) > 0).length;

    // Find last logged meal (Mock/Simulated based on order for now or just check count)
    // Use a placeholder logic for "Last logged" if no real timestamps easily available on the generic entries list without sorting.
    // We'll just say "Last logged: [Last non-empty meal]"
    const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
    const lastLoggedMeal = [...mealTypes].reverse().find(t => getMealCalories(t) > 0);
    const lastLoggedText = lastLoggedMeal
        ? `Last logged: ${lastLoggedMeal.charAt(0).toUpperCase() + lastLoggedMeal.slice(1)}`
        : 'No meals logged';


    return (
        <div className={`
            relative overflow-hidden rounded-2xl bg-[#131518] border border-[#262626] transition-all duration-300 h-full max-h-[450px] flex flex-col
            ${isExpanded ? 'ring-1 ring-[#3B82F6]/50' : 'hover:bg-[#1A1D21]'}
        `}>
            {/* Header / Summary (Always Visible) */}
            <div
                onClick={toggleExpanded}
                className="p-5 cursor-pointer flex-shrink-0"
            >
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-xl bg-[#2A2A2A] border border-[#333] flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[17px] font-bold text-white truncate">Meals</span>
                            <span className="text-[13px] text-[#8E8E93] truncate">Today's intake</span>

                            {/* Collapsed Summary Text */}
                            {!isExpanded && (
                                <span className="text-[11px] text-[#6B6B6B] mt-1 animate-in fade-in duration-200 truncate">
                                    {Math.round(totals.calories)} kcal • {mealsLoggedCount} / 4 meals logged
                                </span>
                            )}
                        </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${status.color} mt-1 sm:mt-0 ml-auto sm:ml-0`}>
                        {status.label}
                    </span>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="flex-1 min-h-0 flex flex-col px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="h-px bg-[#262626] w-full mb-4 flex-shrink-0" />

                    {/* Compact Summary Section */}
                    <div className="mb-4 flex-shrink-0">
                        {/* Unified Row: Macro Pills (Calories + Macros) */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Calories */}
                            <div className="px-3 py-1.5 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center gap-2">
                                <span className="text-[12px] text-[#3B82F6] font-mono font-medium">
                                    {Math.round(totals.calories)} / {targets.calories} kcal
                                </span>
                            </div>

                            {/* Protein */}
                            <div className="px-3 py-1.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center gap-2">
                                <span className="text-[12px] text-[#EF4444] font-mono font-medium">
                                    {Math.round(totals.protein)} / {targets.protein}g
                                </span>
                            </div>

                            {/* Carbs */}
                            <div className="px-3 py-1.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center gap-2">
                                <span className="text-[12px] text-[#10B981] font-mono font-medium">
                                    {Math.round(totals.carbs)} / {targets.carbs}g
                                </span>
                            </div>

                            {/* Fat */}
                            <div className="px-3 py-1.5 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center gap-2">
                                <span className="text-[12px] text-[#F59E0B] font-mono font-medium">
                                    {Math.round(totals.fat)} / {targets.fat}g
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Meal Cards List (Scrolls independently) */}
                    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pr-2 custom-scrollbar">
                        {mealTypes.map((mealType) => (
                            <CompactMealCard
                                key={mealType}
                                type={mealType}
                                entries={entries[mealType]}
                                totalCalories={getMealCalories(mealType)}
                                onDeleteEntry={(entryIds) => onDeleteEntry?.(mealType, entryIds)}
                                onEditEntry={onEditEntry}
                                macrosLayout="row"
                            />
                        ))}
                    </div>

                    {/* Footer - Fixed at bottom */}
                    <div className="mt-4 pt-4 border-t border-[#262626] flex items-center justify-between flex-shrink-0">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-[#6B6B6B]">{lastLoggedText}</span>
                            <span className="text-[11px] text-[#6B6B6B] font-bold">{mealsLoggedCount} / 4 meals logged</span>
                        </div>
                        <span className="text-[11px] text-[#6B6B6B] font-bold">
                            {targets.calories - totals.calories > 0
                                ? `${Math.round(targets.calories - totals.calories)} kcal remaining`
                                : `Over by ${Math.round(totals.calories - targets.calories)} kcal`}
                        </span>
                    </div>

                </div>
            )}
        </div>
    );
}
