
import { useState } from 'react';
import { MealType, FoodEntry } from '../../types';
import { formatQuantity } from '../../lib/format';
import { MealDetailModal } from './MealDetailModal';
import { MoveEntriesModal } from './MoveEntriesModal';


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
                    className="bg-[#141414] border border-[#222] rounded-[24px] p-5 cursor-pointer hover:border-[#333] active:scale-[0.99] transition-all duration-200 relative overflow-visible flex flex-col justify-between h-[140px] w-full shadow-sm"
                >
                    {/* Header: Title & Count & Kcal */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-1 sm:gap-0">
                        <div className="flex items-center gap-2.5">
                            <h3 className="text-[17px] font-semibold text-white tracking-tight leading-none capitalize">{mealLabels[type]}</h3>
                        </div>

                        {/* Meta Row: Moved below title on mobile, right-aligned on desktop */}
                        <div className="flex items-center gap-3 self-start sm:self-auto">
                            <div className={`px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide uppercase ${entries.length > 0 ? 'bg-[#2A2A2A] text-[#A1A1A1]' : 'bg-[#1A1A1A] text-[#444]'}`}>
                                {entries.length} {entries.length === 1 ? 'Item' : 'Items'}
                            </div>
                            {/* Big Kcal Display */}
                            <div className="text-[20px] font-bold text-white tracking-tight leading-none sm:mr-8">
                                {Math.round(totalCalories)}
                            </div>
                        </div>
                    </div>

                    {/* Segmented Bar Calculation */}
                    {(() => {
                        const pCals = entries.reduce((s, e) => s + e.protein, 0) * 4;
                        const cCals = entries.reduce((s, e) => s + e.carbs, 0) * 4;
                        const fCals = entries.reduce((s, e) => s + e.fat, 0) * 9;
                        const totalCalcCals = pCals + cCals + fCals || 1;

                        const pPct = (pCals / totalCalcCals) * 100;
                        const cPct = (cCals / totalCalcCals) * 100;
                        const fPct = (fCals / totalCalcCals) * 100;

                        return (
                            <div className="w-full h-1.5 flex rounded-full overflow-hidden bg-[#2A2A2A] my-3">
                                {entries.length > 0 && (
                                    <>
                                        {/* Fat (Yellow) */}
                                        <div style={{ width: `${fPct}%` }} className="h-full bg-[#FFC44D]" />
                                        {/* Carbs (Green) */}
                                        <div style={{ width: `${cPct}%` }} className="h-full bg-[#4CD964]" />
                                        {/* Protein (Red) */}
                                        <div style={{ width: `${pPct}%` }} className="h-full bg-[#FF4C4C]" />
                                    </>
                                )}
                            </div>
                        );
                    })()}

                    {/* Data Row */}
                    <div className="flex items-end justify-between w-full mt-auto">
                        {/* Horizontal Macros */}
                        {entries.length > 0 ? (
                            <div className="flex items-center gap-4">
                                {/* Protein */}
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF4C4C]"></div>
                                    <span className="text-[13px] font-medium text-[#8E8E93]"><span className="text-white font-bold">{Math.round(entries.reduce((s, e) => s + e.protein, 0))}g</span> P</span>
                                </div>
                                {/* Carbs */}
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#4CD964]"></div>
                                    <span className="text-[13px] font-medium text-[#8E8E93]"><span className="text-white font-bold">{Math.round(entries.reduce((s, e) => s + e.carbs, 0))}g</span> C</span>
                                </div>
                                {/* Fat */}
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#FFC44D]"></div>
                                    <span className="text-[13px] font-medium text-[#8E8E93]"><span className="text-white font-bold">{Math.round(entries.reduce((s, e) => s + e.fat, 0))}g</span> F</span>
                                </div>
                            </div>
                        ) : (
                            /* Empty State */
                            <div className="flex items-center gap-2 opacity-50">
                                <span className="text-[13px] text-[#666] font-medium italic">No items logged</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Menu Button (Absolute Top Right) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                    className="absolute top-4 right-4 p-1.5 text-[#444] hover:text-white rounded-full hover:bg-white/5 transition-colors z-10"
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

