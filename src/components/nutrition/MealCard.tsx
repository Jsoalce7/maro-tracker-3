import { useState } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { MealType, FoodEntry } from '../../types';
import { formatNumber, formatCalories } from '../../lib/format';

interface MealCardProps {
    type: MealType;
    entries: FoodEntry[];
    totalCalories: number;
    // onAddFood removed
    onEditEntry?: (entries: FoodEntry[]) => void;
    onDeleteEntry?: (entryIds: string[]) => void;
}

const mealLabels: Record<MealType, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snacks: 'Snacks',
};

export function MealCard({
    type,
    entries,
    totalCalories,
    onEditEntry,
    onDeleteEntry
}: MealCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Group entries by food ID
    const groupedEntries = entries.reduce((acc, entry) => {
        const key = entry.food?.id || entry.custom_food?.id || entry.recipe?.id || 'unknown';
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(entry);
        return acc;
    }, {} as Record<string, FoodEntry[]>);

    const groups = Object.values(groupedEntries);

    // Aggregate Meal Totals
    const mealTotals = entries.reduce((acc, entry) => ({
        protein: acc.protein + entry.protein,
        carbs: acc.carbs + entry.carbs,
        fat: acc.fat + entry.fat
    }), { protein: 0, carbs: 0, fat: 0 });

    if (entries.length === 0) {
        // Show simplified empty state or just standard collapsed state with 0 values
        // User requested "Collapsed by default". If empty, maybe just show it empty?
        // Let's stick to the card design even if empty, but values 0.
    }

    return (
        <Card className="animate-slide-up border border-[#2A2A2A] bg-[#141414] overflow-hidden">
            {/* Header (Collapsed State) */}
            <div
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-[#1A1A1A] transition-colors gap-2"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Left: Meal Name */}
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white capitalize">{mealLabels[type]}</h3>
                    {entries.length === 0 && (
                        <span className="text-xs text-[#6B6B6B] font-normal">No items</span>
                    )}
                </div>

                {/* Right: Totals */}
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    {entries.length > 0 && (
                        <div className="flex items-center gap-3 text-sm">
                            <span className="font-bold text-white">{totalCalories} kcal</span>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-[#A1A1A1]">
                                <span className="text-[#EF4444]">{Math.round(mealTotals.protein)}p</span>
                                <span className="text-[#10B981]">{Math.round(mealTotals.carbs)}c</span>
                                <span className="text-[#F59E0B]">{Math.round(mealTotals.fat)}f</span>
                            </div>
                        </div>
                    )}

                    <svg
                        className={`w-5 h-5 text-[#6B6B6B] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && entries.length > 0 && (
                <div className="border-t border-[#2A2A2A]">
                    {groups.map((group) => {
                        const firstEntry = group[0];
                        const totalCals = group.reduce((sum, e) => sum + e.calories, 0);
                        const totalGrams = group.reduce((sum, e) => sum + e.quantity_g, 0);

                        // Calculated Macros for the group
                        const groupMacros = group.reduce((acc, e) => ({
                            p: acc.p + e.protein,
                            c: acc.c + e.carbs,
                            f: acc.f + e.fat
                        }), { p: 0, c: 0, f: 0 });

                        // Calculate servings
                        const baseServing = firstEntry.food?.serving_size_g || 100;
                        const servings = totalGrams / baseServing;

                        // Display Name
                        const name = firstEntry.recipe
                            ? firstEntry.recipe.name
                            : (firstEntry.food?.name || firstEntry.custom_food?.name || 'Unknown food');

                        return (
                            <div
                                key={firstEntry.id}
                                className="p-4 border-b border-[#2A2A2A] last:border-b-0 hover:bg-[#1A1A1A] cursor-pointer transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onEditEntry) onEditEntry(group);
                                }}
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-start">
                                        <p className="text-base font-medium text-white">{name}</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-white">{formatCalories(totalCals)} kcal</span>
                                            {onDeleteEntry && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteEntry(group.map(g => g.id));
                                                    }}
                                                    className="text-[#6B6B6B] hover:text-[#EF4444] transition-colors p-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-2 text-sm text-[#A1A1A1]">
                                        <span>
                                            {(firstEntry.metric_quantity && firstEntry.metric_unit)
                                                ? `${firstEntry.metric_quantity} ${firstEntry.metric_unit}`
                                                : `${formatNumber(servings, 1)} servings • ${Math.round(totalGrams)}g`
                                            }
                                        </span>
                                        <span className="text-[#444] hidden sm:inline">•</span>

                                        <div className="flex items-center gap-2 mt-1 sm:mt-0">
                                            <span className="text-[#EF4444]">{Math.round(groupMacros.p)}p</span>
                                            <span className="text-[#10B981]">{Math.round(groupMacros.c)}c</span>
                                            <span className="text-[#F59E0B]">{Math.round(groupMacros.f)}f</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {/* Empty State in Expanded View */}
            {isExpanded && entries.length === 0 && (
                <div className="p-6 text-center text-[#6B6B6B] text-sm border-t border-[#2A2A2A]">
                    No foods logged for {mealLabels[type]}
                </div>
            )}
        </Card>
    );
}
