
import { useState } from 'react';
import { MealType, FoodEntry } from '../../types';
import { formatQuantity } from '../../lib/format';
import { MealDetailModal } from './MealDetailModal';
import { MoveEntriesModal } from './MoveEntriesModal';
import { MacroRing } from './MacroRing';

interface CompactMealCardProps {
    type: MealType;
    entries: FoodEntry[];
    totalCalories: number;
    onEditEntry?: (entries: FoodEntry[]) => void;
    onDeleteEntry?: (entryIds: string[]) => void;
    onMoveEntry?: (entryIds: string[], targetMeal: MealType) => void;
    onSaveAsMyMeal?: (entries: FoodEntry[]) => void;
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
    onMoveEntry,
    onSaveAsMyMeal,
    macrosLayout = 'stack'
}: CompactMealCardProps) {
    const [showDetail, setShowDetail] = useState(false);
    const [showMove, setShowMove] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // Group entries logic (for passing to SaveAsMyMeal)
    const groupedEntries = entries.reduce((acc, entry) => {
        const key = entry.food?.id || entry.custom_food?.id || entry.recipe?.id || 'unknown';
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(entry);
        return acc;
    }, {} as Record<string, FoodEntry[]>);
    const groups = Object.values(groupedEntries);

    const handleSaveMyMeal = () => {
        setShowMenu(false);
        // Flatten entries for the handler
        onSaveAsMyMeal?.(entries);
    };

    return (
        <>
            <div className="relative group w-full">
                {/* Card */}
                <div
                    onClick={() => setShowDetail(true)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setShowMenu(true);
                    }}
                    className="bg-[#131518] border border-[#262626] rounded-[20px] p-4 cursor-pointer hover:bg-[#1A1D21] transition-colors relative overflow-hidden flex flex-row items-center justify-between h-[130px] w-full"
                >
                    {/* Left Side: Title & Macros */}
                    <div className="flex flex-col justify-between h-full">
                        <div>
                            <h3 className="text-[17px] font-bold text-white capitalize mb-0.5">{mealLabels[type]}</h3>
                            <div className="text-[12px] text-[#8E8E93]">
                                {entries.length} {entries.length === 1 ? 'item' : 'items'}
                            </div>
                        </div>

                        {macrosLayout === 'row' ? (
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[12px] text-[#8E8E93] font-medium">
                                    <span className="text-[#FF4C4C] font-semibold">Pro</span> {Math.round(entries.reduce((s, e) => s + e.protein, 0))}g
                                </span>
                                <span className="text-[12px] text-[#6B6B6B]">•</span>
                                <span className="text-[12px] text-[#8E8E93] font-medium">
                                    <span className="text-[#4CD964] font-semibold">Carbs</span> {Math.round(entries.reduce((s, e) => s + e.carbs, 0))}g
                                </span>
                                <span className="text-[12px] text-[#6B6B6B]">•</span>
                                <span className="text-[12px] text-[#8E8E93] font-medium">
                                    <span className="text-[#FFC44D] font-semibold">Fat</span> {Math.round(entries.reduce((s, e) => s + e.fat, 0))}g
                                </span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[12px] text-[#FF4C4C] font-semibold">Protein</span>
                                    <span className="text-[12px] text-white font-bold">{Math.round(entries.reduce((s, e) => s + e.protein, 0))}g</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[12px] text-[#4CD964] font-semibold">Carbs</span>
                                    <span className="text-[12px] text-white font-bold">{Math.round(entries.reduce((s, e) => s + e.carbs, 0))}g</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[12px] text-[#FFC44D] font-semibold">Fat</span>
                                    <span className="text-[12px] text-white font-bold">{Math.round(entries.reduce((s, e) => s + e.fat, 0))}g</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Ring */}
                    <div className="pr-3 flex items-center justify-center">
                        <MacroRing
                            calories={totalCalories}
                            protein={entries.reduce((s, e) => s + e.protein, 0)}
                            carbs={entries.reduce((s, e) => s + e.carbs, 0)}
                            fat={entries.reduce((s, e) => s + e.fat, 0)}
                            size={64}
                            strokeWidth={6}
                        />
                    </div>
                </div>

                {/* More Button (Visible on hover or mobile always?) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                    className="absolute top-3 right-3 p-1.5 text-[#6B6B6B] hover:text-white rounded-full hover:bg-white/10 z-10"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                </button>

                {/* Context Menu Dropdown */}
                {showMenu && (
                    <>
                        <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                        <div className="absolute top-10 right-3 z-30 bg-[#1A1D21] border border-[#2A2A2A] rounded-xl shadow-xl w-48 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <button
                                onClick={() => { setShowMenu(false); setShowMove(true); }}
                                disabled={entries.length === 0}
                                className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#252525] flex items-center gap-2 disabled:opacity-50"
                            >
                                <span>⇄</span> Move items...
                            </button>
                            <button
                                onClick={handleSaveMyMeal}
                                disabled={entries.length === 0}
                                className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#252525] flex items-center gap-2 disabled:opacity-50"
                            >
                                <span>💾</span> Save as My Meal
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            {showDetail && (
                <MealDetailModal
                    type={type}
                    entries={entries}
                    onClose={() => setShowDetail(false)}
                    onEditEntry={onEditEntry}
                    onDeleteEntry={onDeleteEntry}
                />
            )}

            {showMove && (
                <MoveEntriesModal
                    currentMealType={type}
                    entries={entries}
                    onClose={() => setShowMove(false)}
                    onMove={onMoveEntry || (() => { })}
                />
            )}
        </>
    );
}

