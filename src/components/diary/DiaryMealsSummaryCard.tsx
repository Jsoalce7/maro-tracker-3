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

    // Status Logic
    const remaining = targets.calories - totals.calories;
    const isOver = remaining < 0;

    const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

    return (
        <div className={`
            relative overflow-visible rounded-[24px] bg-[#141414] border border-[#222] transition-all duration-300 flex flex-col
            ${isExpanded ? 'ring-1 ring-[#333]' : 'hover:border-[#333]'}
        `}>
            {/* Header (Always Visible) */}
            <div
                onClick={toggleExpanded}
                className="p-5 cursor-pointer flex-shrink-0"
            >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Top Row: Title & Action */}
                    <div className="flex items-center justify-between md:justify-start md:gap-6 flex-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                                <span className="text-xl">🍎</span>
                            </div>
                            <div>
                                <h2 className="text-[17px] font-bold text-white tracking-tight leading-none">Daily Intake</h2>
                                <p className="text-[12px] text-[#666] font-medium mt-0.5">Summary</p>
                            </div>
                        </div>
                        {/* Status Badge (Mobile only, on Desktop move to right) */}
                        <div className={`md:hidden px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${isOver
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            }`}>
                            {isOver ? 'Over' : 'Track'}
                        </div>
                    </div>

                    {/* Stats Row (Collapsed) */}
                    {!isExpanded && (
                        <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 flex-1">
                            {/* Stats */}
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col md:items-end">
                                    <span className="text-[24px] font-bold text-white tracking-tight leading-none">{Math.round(totals.calories)}</span>
                                    <span className="text-[11px] text-[#666] font-bold uppercase tracking-wider">Consumed</span>
                                </div>
                                <div className="w-px h-8 bg-[#2A2A2A]" />
                                <div className="flex flex-col md:items-end">
                                    <span className="text-[24px] font-bold text-[#666] tracking-tight leading-none">{Math.abs(Math.round(remaining))}</span>
                                    <span className="text-[11px] text-[#666] font-bold uppercase tracking-wider">{isOver ? 'Over' : 'Left'}</span>
                                </div>
                            </div>

                            {/* Desktop Status Badge */}
                            <div className={`hidden md:block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${isOver
                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                }`}>
                                {isOver ? 'Over Limit' : 'On Track'}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="flex-1 min-h-0 flex flex-col px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="h-px bg-[#222] w-full mb-5 flex-shrink-0" />

                    {/* Macro Pills Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-6 flex-shrink-0">
                        {/* Protein */}
                        <div className="bg-[#1A1A1A] rounded-xl p-2.5 border border-[#262626] flex flex-col items-center">
                            <span className="text-[10px] text-[#666] font-bold uppercase tracking-wider mb-0.5">Protein</span>
                            <span className="text-[14px] font-bold text-[#EF4444]">{Math.round(totals.protein)}<span className="text-[#444] text-[10px] ml-0.5">/ {targets.protein}g</span></span>
                        </div>
                        {/* Carbs */}
                        <div className="bg-[#1A1A1A] rounded-xl p-2.5 border border-[#262626] flex flex-col items-center">
                            <span className="text-[10px] text-[#666] font-bold uppercase tracking-wider mb-0.5">Carbs</span>
                            <span className="text-[14px] font-bold text-[#10B981]">{Math.round(totals.carbs)}<span className="text-[#444] text-[10px] ml-0.5">/ {targets.carbs}g</span></span>
                        </div>
                        {/* Fat */}
                        <div className="bg-[#1A1A1A] rounded-xl p-2.5 border border-[#262626] flex flex-col items-center">
                            <span className="text-[10px] text-[#666] font-bold uppercase tracking-wider mb-0.5">Fat</span>
                            <span className="text-[14px] font-bold text-[#F59E0B]">{Math.round(totals.fat)}<span className="text-[#444] text-[10px] ml-0.5">/ {targets.fat}g</span></span>
                        </div>
                    </div>

                    {/* Meal Cards List */}
                    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pr-1 custom-scrollbar">
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
                </div>
            )}
        </div>
    );
}
