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
    const [isExpanded, setIsExpanded] = useState(entries.length > 0);

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

    return (
        <Card className="animate-slide-up">
            {/* Header */}
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#242424] flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#A1A1A1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">{mealLabels[type]}</h3>
                        <p className="text-xs text-[#6B6B6B]">
                            {groups.length} {groups.length === 1 ? 'item' : 'items'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[#A1A1A1]">
                        {totalCalories} kcal
                    </span>
                    <svg
                        className={`w-5 h-5 text-[#6B6B6B] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
                <div className="mt-4 space-y-3">
                    {groups.length === 0 ? (
                        <p className="text-sm text-[#6B6B6B] text-center py-4">
                            No foods logged yet
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {groups.map((group) => {
                                // Aggregate data for the group
                                const firstEntry = group[0];
                                const totalCals = group.reduce((sum, e) => sum + e.calories, 0);
                                const totalGrams = group.reduce((sum, e) => sum + e.quantity_g, 0);

                                // Calculate servings: Total Grams / Base Serving Size
                                const baseServing = firstEntry.food?.serving_size_g || 100;
                                const servings = totalGrams / baseServing;

                                return (
                                    <div
                                        key={firstEntry.id} // Stable-ish key
                                        className="flex items-center justify-between py-2 px-3 rounded-xl bg-[#141414] group cursor-pointer hover:bg-[#1f1f1f] transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onEditEntry) onEditEntry(group);
                                        }}
                                    >
                                        <div className="flex-1">
                                            <p className="text-sm text-white">
                                                {firstEntry.recipe ? firstEntry.recipe.name : (firstEntry.food?.name || firstEntry.custom_food?.name || 'Unknown food')}
                                            </p>
                                            <p className="text-xs text-[#6B6B6B]">
                                                {/* Use metric quantity if available, else servings + grams */}
                                                {(firstEntry.metric_quantity && firstEntry.metric_unit) ? (
                                                    <span>{firstEntry.metric_quantity} {firstEntry.metric_unit}</span>
                                                ) : (
                                                    <>
                                                        {formatNumber(servings, 1)} servings
                                                        <span className="text-[#444] mx-1">•</span>
                                                        {totalGrams}g
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className="text-sm font-medium text-[#A1A1A1]">{formatCalories(totalCals)} kcal</span>
                                                <div className="text-[10px] text-[#555] flex gap-1 justify-end">
                                                    <span className="text-[#EF4444]">{Math.round(group.reduce((s, e) => s + e.protein, 0))}p</span>
                                                    <span className="text-[#10B981]">{Math.round(group.reduce((s, e) => s + e.carbs, 0))}c</span>
                                                    <span className="text-[#F59E0B]">{Math.round(group.reduce((s, e) => s + e.fat, 0))}f</span>
                                                </div>
                                            </div>

                                            {/* Delete Button (Delete Group) */}
                                            {onDeleteEntry && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteEntry(group.map(g => g.id));
                                                    }}
                                                    className="p-1 hover:bg-[#242424] rounded text-[#6B6B6B] hover:text-[#EF4444]"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}
