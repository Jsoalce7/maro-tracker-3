import { MealType, FoodEntry } from '../../types';
import { formatQuantity } from '../../lib/format';
import { MacroRing } from './MacroRing';

interface MealDetailModalProps {
    type: string;
    entries: FoodEntry[];
    onClose: () => void;
    onEditEntry?: (entries: FoodEntry[]) => void;
    onDeleteEntry?: (entryIds: string[]) => void;
}

const mealLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snacks: 'Snacks',
};

export function MealDetailModal({ type, entries, onClose, onEditEntry, onDeleteEntry }: MealDetailModalProps) {
    // Group entries logic (Reused)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 bg-[#141414] w-full max-w-md rounded-3xl p-5 border border-[#2A2A2A] shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white capitalize">{mealLabels[type] || type}</h2>
                    <button onClick={onClose} className="p-2 -mr-2 text-[#6B6B6B] hover:text-white rounded-full hover:bg-[#2A2A2A] transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {groups.length === 0 ? (
                        <div className="text-[#8E8E93] text-sm text-center py-8">
                            No items logged
                        </div>
                    ) : (
                        groups.map((group) => {
                            const firstEntry = group[0];
                            const totalCals = group.reduce((sum, e) => sum + e.calories, 0);
                            const totalGrams = group.reduce((sum, e) => sum + e.quantity_g, 0);

                            const baseServing = firstEntry.food?.serving_size_g || 100;
                            const servings = totalGrams / baseServing;

                            const name = firstEntry.recipe
                                ? firstEntry.recipe.name
                                : (firstEntry.food?.name || firstEntry.custom_food?.name || 'Unknown food');

                            const servingText = (firstEntry.metric_quantity && firstEntry.metric_unit)
                                ? `${formatQuantity(firstEntry.metric_quantity)} ${firstEntry.metric_unit}`
                                : `${formatQuantity(servings)} serving${servings !== 1 ? 's' : ''}`;

                            // Calculate group macros for the ring
                            const groupMacros = group.reduce((acc, e) => ({
                                p: acc.p + e.protein,
                                c: acc.c + e.carbs,
                                f: acc.f + e.fat
                            }), { p: 0, c: 0, f: 0 });

                            return (
                                <div
                                    key={firstEntry.id || Math.random()}
                                    className="bg-[#1A1D21] rounded-xl p-3 flex items-center justify-between border border-[#262626] relative hover:border-[#3B82F6]/50 transition-colors cursor-pointer"
                                    onClick={() => {
                                        onClose();
                                        onEditEntry?.(group);
                                    }}
                                >
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="text-[15px] font-medium text-white truncate flex items-center gap-2">
                                            {firstEntry.recipe && (
                                                <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-[4px] uppercase font-bold tracking-wider inline-flex items-center whitespace-nowrap">
                                                    🧩 My Meal
                                                </span>
                                            )}
                                            <span className="truncate">{name}</span>
                                        </div>
                                        <div className="text-[13px] text-[#8E8E93]">
                                            {firstEntry.recipe
                                                ? `${firstEntry.recipe.ingredients?.length || '0'} ingredients · ${servingText}`
                                                : servingText
                                            } • {Math.round(totalCals)} kcal
                                        </div>
                                    </div>

                                    {/* Mini Macro Ring */}
                                    <div className="flex items-center justify-center shrink-0 px-2">
                                        <MacroRing
                                            calories={totalCals}
                                            protein={groupMacros.p}
                                            carbs={groupMacros.c}
                                            fat={groupMacros.f}
                                            size={42}
                                            strokeWidth={4}
                                            hideText={false}
                                        />
                                    </div>

                                    {onDeleteEntry && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteEntry(group.map(g => g.id));
                                            }}
                                            className="w-9 h-9 flex items-center justify-center rounded-full text-[#6B6B6B] hover:text-[#FF4C4C] hover:bg-[#2C1A1A] transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-[#2A2A2A] hover:bg-[#333] text-white font-medium rounded-xl transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
