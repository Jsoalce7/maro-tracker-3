import { useState } from 'react';
import { Card } from '../ui/Card';
import { MealType, FoodEntry } from '../../types';
import { formatCalories, formatQuantity } from '../../lib/format';
import { MacroRing } from './MacroRing';

interface MealCardProps {
    type: MealType;
    entries: FoodEntry[];
    totalCalories: number;
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
    const itemCount = entries.length;

    // Aggregate Meal Totals
    const mealTotals = entries.reduce((acc, entry) => ({
        protein: acc.protein + entry.protein,
        carbs: acc.carbs + entry.carbs,
        fat: acc.fat + entry.fat
    }), { protein: 0, carbs: 0, fat: 0 });

    return (
        <div className="w-full relative">
            {/* Summary Card (Always Visible) */}
            <div
                className="bg-[#131518] rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.4)] cursor-pointer active:scale-[0.99] transition-all border border-[#262626] relative z-20"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    {/* Left Side: Text & Macros */}
                    <div className="flex flex-col gap-3">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                            <div>
                                <h3 className="text-[20px] font-bold text-white capitalize tracking-tight leading-none mb-1">{mealLabels[type]}</h3>
                                <div className="text-[13px] text-[#8E8E93] font-medium tracking-wide">
                                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                </div>
                            </div>
                            {/* Chevron Indicator */}
                            <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                                <svg className="w-5 h-5 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Vertical Macro Stack */}
                        <div className="flex flex-col gap-1.5 mt-1">
                            {/* Protein */}
                            <div className="flex items-center gap-2">
                                <span className="text-[13px] font-bold text-[#FF4C4C] w-14">Protein</span>
                                <span className="text-[14px] font-semibold text-white">{Math.round(mealTotals.protein)}g</span>
                            </div>
                            {/* Carbs */}
                            <div className="flex items-center gap-2">
                                <span className="text-[13px] font-bold text-[#4CD964] w-14">Carbs</span>
                                <span className="text-[14px] font-semibold text-white">{Math.round(mealTotals.carbs)}g</span>
                            </div>
                            {/* Fat */}
                            <div className="flex items-center gap-2">
                                <span className="text-[13px] font-bold text-[#FFC44D] w-14">Fat</span>
                                <span className="text-[14px] font-semibold text-white">{Math.round(mealTotals.fat)}g</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Ring (with Calories Inside) */}
                    <div className="flex items-center justify-center min-w-[80px] sm:min-w-[100px] pr-2">
                        <MacroRing
                            calories={totalCalories}
                            protein={mealTotals.protein}
                            carbs={mealTotals.carbs}
                            fat={mealTotals.fat}
                            size={72}
                            strokeWidth={6}
                        />
                    </div>
                </div>
            </div>

            {/* Expanded Items (Accordion) */}
            <div
                className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? 'opacity-100 mt-3' : 'opacity-0 max-h-0 mt-0'}`}
                style={{ maxHeight: isExpanded ? '2000px' : '0px' }}
            >
                {/* Grid Layout: 1 col on XS, 2 col on SM+, Auto-fit on LG */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {groups.map((group) => {
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
                                className="bg-[#131518] rounded-[20px] p-4 flex items-center justify-between border border-[#262626] shadow-sm transform transition-transform active:scale-[0.98] cursor-pointer relative z-10 min-h-[100px]"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onEditEntry) onEditEntry(group);
                                }}
                            >
                                {/* Delete Action (Absolute Top Right) */}
                                {onDeleteEntry && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteEntry(group.map(g => g.id));
                                        }}
                                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-[#1F2125] text-[#8E8E93] hover:text-[#FF4C4C] transition-colors z-20"
                                        aria-label="Delete item"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}

                                {/* Left Side: Name & Macros */}
                                <div className="flex flex-col gap-2 flex-1 min-w-0 pr-2">
                                    {/* Name */}
                                    <div className="pr-6"> {/* Padding for absolute button */}
                                        <div className="text-[15px] font-bold text-white leading-tight mb-0.5 truncate">
                                            {name}
                                        </div>
                                        <div className="text-[12px] text-[#8E8E93] font-medium truncate">
                                            {servingText}
                                        </div>
                                    </div>

                                    {/* Vertical Macro Stack */}
                                    <div className="flex flex-col gap-1 mt-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-[#FF4C4C] w-10">Prot</span>
                                            <span className="text-[12px] font-semibold text-white">{Math.round(groupMacros.p)}g</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-[#4CD964] w-10">Carb</span>
                                            <span className="text-[12px] font-semibold text-white">{Math.round(groupMacros.c)}g</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-[#FFC44D] w-10">Fat</span>
                                            <span className="text-[12px] font-semibold text-white">{Math.round(groupMacros.f)}g</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Ring (Centered) */}
                                <div className="flex items-center justify-center shrink-0 pl-2">
                                    <MacroRing
                                        calories={totalCals}
                                        protein={groupMacros.p}
                                        carbs={groupMacros.c}
                                        fat={groupMacros.f}
                                        size={52}
                                        strokeWidth={5}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
