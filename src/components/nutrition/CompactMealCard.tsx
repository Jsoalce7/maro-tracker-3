
import { useState } from 'react';
import { MealType, FoodEntry } from '../../types';
import { formatQuantity } from '../../lib/format';
import { MacroRing } from './MacroRing';

interface CompactMealCardProps {
    type: MealType;
    entries: FoodEntry[];
    totalCalories: number;
    onEditEntry?: (entries: FoodEntry[]) => void;
    onDeleteEntry?: (entryIds: string[]) => void;
    macrosLayout?: 'stack' | 'row';
}

const mealLabels: Record<MealType, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snacks: 'Snacks',
};

export function CompactMealCard({
    type,
    entries,
    totalCalories,
    onEditEntry,
    onDeleteEntry,
    macrosLayout = 'stack'
}: CompactMealCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Group entries by food ID (Same logic as MealCard)
    const groupedEntries = entries.reduce((acc, entry) => {
        const key = entry.food?.id || entry.custom_food?.id || entry.recipe?.id || 'unknown';
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(entry);
        return acc;
    }, {} as Record<string, FoodEntry[]>);

    const groups = Object.values(groupedEntries);
    const itemCount = entries.length;

    // Aggregate Meal Totals
    const mealTotals = entries.reduce((acc, entry) => ({
        protein: acc.protein + entry.protein,
        carbs: acc.carbs + entry.carbs,
        fat: acc.fat + entry.fat
    }), { protein: 0, carbs: 0, fat: 0 });

    return (
        <div className="flex flex-col w-full">
            {/* Summary Card - Click to Toggle */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="bg-[#131518] border border-[#262626] rounded-[20px] p-4 cursor-pointer hover:bg-[#1A1D21] transition-colors relative overflow-hidden flex flex-row items-center justify-between h-[130px] w-full"
            >
                {/* Left Side: Title & Macros */}
                <div className="flex flex-col justify-between h-full">
                    {/* Top: Title & Count */}
                    <div>
                        <h3 className="text-[17px] font-bold text-white capitalize mb-0.5">{mealLabels[type]}</h3>
                        <div className="text-[12px] text-[#8E8E93]">
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </div>
                    </div>

                    {/* Bottom: Macros */}
                    {/* Bottom: Macros */}
                    {macrosLayout === 'row' ? (
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[12px] text-[#8E8E93] font-medium">
                                <span className="text-[#FF4C4C] font-semibold">Pro</span> {Math.round(mealTotals.protein)}g
                            </span>
                            <span className="text-[12px] text-[#6B6B6B]">•</span>
                            <span className="text-[12px] text-[#8E8E93] font-medium">
                                <span className="text-[#4CD964] font-semibold">Carbs</span> {Math.round(mealTotals.carbs)}g
                            </span>
                            <span className="text-[12px] text-[#6B6B6B]">•</span>
                            <span className="text-[12px] text-[#8E8E93] font-medium">
                                <span className="text-[#FFC44D] font-semibold">Fat</span> {Math.round(mealTotals.fat)}g
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[12px] text-[#FF4C4C] font-semibold">Protein</span>
                                <span className="text-[12px] text-white font-bold">{Math.round(mealTotals.protein)}g</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[12px] text-[#4CD964] font-semibold">Carbs</span>
                                <span className="text-[12px] text-white font-bold">{Math.round(mealTotals.carbs)}g</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[12px] text-[#FFC44D] font-semibold">Fat</span>
                                <span className="text-[12px] text-white font-bold">{Math.round(mealTotals.fat)}g</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Ring (Centered) */}
                <div className="pr-3 flex items-center justify-center">
                    <MacroRing
                        calories={totalCalories}
                        protein={mealTotals.protein}
                        carbs={mealTotals.carbs}
                        fat={mealTotals.fat}
                        size={64}
                        strokeWidth={6}
                    />
                </div>
            </div>

            {/* Expanded Content: Food List */}
            {isExpanded && (
                <div className="mt-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {groups.length === 0 ? (
                        <div className="text-[#8E8E93] text-sm text-center py-4 bg-[#131518] rounded-[16px] border border-[#262626]">
                            No items logged
                        </div>
                    ) : (
                        groups.map((group) => {
                            const firstEntry = group[0];
                            const totalCals = group.reduce((sum, e) => sum + e.calories, 0);
                            const totalGrams = group.reduce((sum, e) => sum + e.quantity_g, 0);

                            const groupMacros = group.reduce((acc, e) => ({
                                p: acc.p + e.protein,
                                c: acc.c + e.carbs,
                                f: acc.f + e.fat
                            }), { p: 0, c: 0, f: 0 });

                            const baseServing = firstEntry.food?.serving_size_g || 100;
                            const servings = totalGrams / baseServing;

                            const name = firstEntry.recipe
                                ? firstEntry.recipe.name
                                : (firstEntry.food?.name || firstEntry.custom_food?.name || 'Unknown food');

                            const servingText = (firstEntry.metric_quantity && firstEntry.metric_unit)
                                ? `${formatQuantity(firstEntry.metric_quantity)} ${firstEntry.metric_unit}`
                                : `${formatQuantity(servings)} serving${servings !== 1 ? 's' : ''}`;

                            return (
                                <div
                                    key={firstEntry.id}
                                    className="bg-[#131518] rounded-[16px] p-3 flex items-center justify-between border border-[#262626] relative"
                                    onClick={() => onEditEntry?.(group)}
                                >
                                    {/* Simple Details View */}
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="text-[14px] font-medium text-white truncate">{name}</div>
                                        <div className="text-[12px] text-[#8E8E93]">{servingText} • {Math.round(totalCals)} kcal</div>
                                    </div>

                                    {/* Action: Delete */}
                                    {onDeleteEntry && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteEntry(group.map(g => g.id));
                                            }}
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1F2125] text-[#8E8E93] hover:text-[#FF4C4C]"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
