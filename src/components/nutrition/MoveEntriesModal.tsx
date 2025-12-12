import { useState } from 'react';
import { MealType, FoodEntry } from '../../types';
import { formatQuantity } from '../../lib/format';

interface MoveEntriesModalProps {
    currentMealType: MealType;
    entries: FoodEntry[];
    onClose: () => void;
    onMove: (entryIds: string[], targetMealType: MealType) => void;
}

const mealLabels: Record<MealType, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snacks: 'Snacks',
};

export function MoveEntriesModal({ currentMealType, entries, onClose, onMove }: MoveEntriesModalProps) {
    // Group entries just like other views
    const groupedEntries = entries.reduce((acc, entry) => {
        const key = entry.food?.id || entry.custom_food?.id || entry.recipe?.id || 'unknown';
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(entry);
        return acc;
    }, {} as Record<string, FoodEntry[]>);

    const groups = Object.values(groupedEntries);

    // State
    const [selectedGroupIndices, setSelectedGroupIndices] = useState<Set<number>>(new Set());
    const [targetMeal, setTargetMeal] = useState<MealType>(
        currentMealType === 'breakfast' ? 'lunch' : 'breakfast' // Default to something else
    );

    const toggleSelection = (index: number) => {
        const next = new Set(selectedGroupIndices);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        setSelectedGroupIndices(next);
    };

    const toggleAll = () => {
        if (selectedGroupIndices.size === groups.length) {
            setSelectedGroupIndices(new Set());
        } else {
            setSelectedGroupIndices(new Set(groups.map((_, i) => i)));
        }
    };

    const handleMove = () => {
        const selectedIds: string[] = [];
        selectedGroupIndices.forEach(index => {
            const group = groups[index];
            group.forEach(e => selectedIds.push(e.id));
        });

        if (selectedIds.length === 0) return;

        onMove(selectedIds, targetMeal);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 bg-[#141414] w-full max-w-md rounded-3xl p-5 border border-[#2A2A2A] shadow-2xl animate-in zoom-in-95 duration-200">
                <h2 className="text-xl font-bold text-white mb-4">Move Items</h2>

                {/* Selection List */}
                <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-sm text-[#6B6B6B]">{selectedGroupIndices.size} selected</span>
                    <button onClick={toggleAll} className="text-sm text-[#3B82F6]">
                        {selectedGroupIndices.size === groups.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>

                <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar mb-4 bg-[#0A0A0A] p-2 rounded-xl border border-[#262626]">
                    {groups.map((group, index) => {
                        const firstEntry = group[0];
                        const name = firstEntry.recipe
                            ? firstEntry.recipe.name
                            : (firstEntry.food?.name || firstEntry.custom_food?.name || 'Unknown food');
                        const isSelected = selectedGroupIndices.has(index);

                        return (
                            <div
                                key={index}
                                onClick={() => toggleSelection(index)}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-[#3B82F6]/10 border-[#3B82F6]' : 'bg-[#1A1D21] border-transparent hover:border-[#333]'}`}
                            >
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-[#3B82F6] border-[#3B82F6]' : 'border-[#6B6B6B]'}`}>
                                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span className="text-sm text-white font-medium truncate">{name}</span>
                            </div>
                        )
                    })}
                </div>

                {/* Target Selector */}
                <div className="space-y-2">
                    <label className="text-xs text-[#6B6B6B] uppercase font-bold">Move to</label>
                    <div className="grid grid-cols-2 gap-2">
                        {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => setTargetMeal(type)}
                                disabled={type === currentMealType}
                                className={`p-3 rounded-xl text-sm font-medium border transition-all ${type === targetMeal
                                        ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                                        : (type === currentMealType
                                            ? 'bg-[#1A1A1A] text-[#444] border-transparent cursor-not-allowed'
                                            : 'bg-[#1A1A1A] text-[#8E8E93] border-transparent hover:border-[#333]')
                                    }`}
                            >
                                {mealLabels[type]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-3 text-[#6B6B6B] hover:text-white font-medium">Cancel</button>
                    <button
                        onClick={handleMove}
                        disabled={selectedGroupIndices.size === 0}
                        className="flex-1 py-3 bg-[#3B82F6] text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Move Items
                    </button>
                </div>
            </div>
        </div>
    );
}
