import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { FoodEntry } from '../../types';
import { calculateEntryNutrition } from '../../lib/calculations';
import { useFood } from '../../hooks/useFood';
import { useHideNavBar } from '../../hooks/useHideNavBar';

interface EditEntryModalProps {
    entries: FoodEntry[];
    onClose: () => void;
    onUpdate: (
        entryIds: string[],
        quantity: number,
        nutrition: { calories: number; protein: number; carbs: number; fat: number },
        logged_at?: string,
        metric_quantity?: number,
        metric_unit?: string
    ) => void;
    onDelete?: (entryIds: string[]) => void;
    // New optional prop to jump to editing the food definition
    onEditFoodData?: (foodId: string) => void;
}

export function EditEntryModal({ entries, onClose, onUpdate, onDelete, onEditFoodData }: EditEntryModalProps) {
    useHideNavBar();
    const { favorites, toggleFavorite } = useFood();

    // Aggregates
    const firstEntry = entries[0];
    const totalCurrentGrams = entries.reduce((sum, e) => sum + e.quantity_g, 0);
    const servingSize = firstEntry.food?.serving_size_g || 100;

    // Determine initial unit and quantity
    // Priority: metric_unit from entry -> serving_unit from food -> default logic
    const entryMetricUnit = firstEntry.metric_unit;
    const entryMetricQty = firstEntry.metric_quantity;

    const [unit, setUnit] = useState<'g' | 'serving' | 'oz' | 'ml'>('g');
    const [quantity, setQuantity] = useState('');

    // Logic to determine initial unit:
    // 1. If we have a stored metric unit/qty, use that.
    // 2. Else check if it's an exact serving, use 'serving'.
    // 3. Fallback to 'g'.
    useEffect(() => {
        if (entryMetricUnit && entryMetricQty) {
            setUnit(entryMetricUnit as any);
            setQuantity(entryMetricQty.toString());
        } else {
            const isExactServing = Math.abs((totalCurrentGrams / servingSize) - Math.round(totalCurrentGrams / servingSize)) < 0.01;
            if (isExactServing) {
                setUnit('serving');
                setQuantity((totalCurrentGrams / servingSize).toString());
            } else {
                setUnit('g');
                setQuantity(totalCurrentGrams.toString());
            }
        }
    }, []); // Run once on mount

    // Time state - use first entry's time
    const initialTime = firstEntry.logged_at
        ? new Date(firstEntry.logged_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    const [time, setTime] = useState(initialTime);

    // Calculate grams based on current unit for nutrition preview
    const currentGrams = (() => {
        const val = parseFloat(quantity) || 0;
        if (unit === 'g' || unit === 'ml') return val;
        if (unit === 'oz') return val * 28.3495;
        if (unit === 'serving') return val * servingSize;
        return 0;
    })();

    const nutrition = firstEntry.food
        ? calculateEntryNutrition(firstEntry.food, currentGrams)
        : { calories: 0, protein: 0, carbs: 0, fat: 0 };

    // Helper to switch units and convert value
    const handleUnitChange = (newUnit: 'g' | 'serving' | 'oz' | 'ml') => {
        const val = parseFloat(quantity) || 0;
        let grams = 0;

        // Convert current to grams
        if (unit === 'g' || unit === 'ml') grams = val; // approx for ml
        else if (unit === 'oz') grams = val * 28.3495;
        else if (unit === 'serving') grams = val * servingSize;

        // Convert grams to new unit
        let newVal = 0;
        if (newUnit === 'g' || newUnit === 'ml') newVal = grams;
        else if (newUnit === 'oz') newVal = grams / 28.3495;
        else if (newUnit === 'serving') newVal = grams / servingSize;

        // Format nicely
        setQuantity(Number.isInteger(newVal) ? newVal.toString() : newVal.toFixed(1));
        setUnit(newUnit);
    };

    const handleSave = () => {
        if (currentGrams <= 0) return;
        if (!entries.length) return;

        // Nutrition is calculated from currentGrams
        const food = firstEntry.food;
        const ratio = currentGrams / 100;
        const nutrition = {
            calories: (food?.calories_per_100g || 0) * ratio,
            protein: (food?.protein_per_100g || 0) * ratio,
            carbs: (food?.carbs_per_100g || 0) * ratio,
            fat: (food?.fat_per_100g || 0) * ratio,
        };

        const firstEntryItem = entries[0];
        let newLoggedAt = new Date().toISOString();
        if (firstEntryItem.logged_at) {
            const originalDate = new Date(firstEntryItem.logged_at);
            const [hours, minutes] = time.split(':').map(Number);
            originalDate.setHours(hours, minutes);
            newLoggedAt = originalDate.toISOString();
        }

        onUpdate(
            entries.map(e => e.id),
            currentGrams, // This is quantity_g
            nutrition,
            newLoggedAt,
            parseFloat(quantity) || 0, // metric_quantity
            unit // metric_unit
        );
        onClose();
    };

    const isFavorited = favorites?.some(f => f.id === firstEntry.food?.id);
    const isCustom = (firstEntry.food as any)?.is_custom;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-safe-mobile" style={{ touchAction: 'none' }}>
            {/* ... Backdrop ... */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full modal-safe-mobile sm:max-w-md bg-[#1A1A1A] sm:rounded-3xl flex flex-col shadow-2xl ring-1 ring-white/10 overflow-hidden">
                <div className="flex items-start justify-between p-4 sm:p-6 pb-3 border-b border-[#2A2A2A] modal-header-safe">
                    <div className="flex-1 pr-4 min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-white">Edit Entry</h2>
                            {/* Favorite Toggle */}
                            {!isCustom && firstEntry.food && (
                                <button
                                    onClick={() => toggleFavorite({ foodId: firstEntry.food!.id, isFavorite: !!isFavorited })}
                                    className="p-1 hover:bg-[#242424] rounded-full transition-colors"
                                >
                                    <svg
                                        className={`w-5 h-5 ${isFavorited ? 'text-red-500 fill-current' : 'text-[#6B6B6B]'}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <p className="text-[#6B6B6B] truncate">
                                {firstEntry.food?.name}
                                {entries.length > 1 && <span className="text-xs ml-2 bg-[#2A2A2A] px-2 py-0.5 rounded-full text-[#A1A1A1]">Merged {entries.length} items</span>}
                            </p>
                            {/* Edit Data Link */}
                            {isCustom && onEditFoodData && (
                                <button
                                    onClick={() => { onEditFoodData(firstEntry.food!.id); onClose(); }}
                                    className="text-xs text-[#3B82F6] hover:underline flex items-center gap-1"
                                >
                                    Edit Data
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[#242424] rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 text-[#6B6B6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* Quantity Section */}
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm text-[#A1A1A1]">Quantity</label>
                                {/* Unit Toggle */}
                                <div className="flex bg-[#141414] rounded-xl border border-[#2A2A2A] overflow-hidden shrink-0">
                                    {(['g', 'ml', 'oz', 'serving'] as const).map(u => (
                                        <button
                                            key={u}
                                            onClick={() => handleUnitChange(u)}
                                            className={`px-2.5 sm:px-3 py-2 sm:py-1.5 font-medium text-xs sm:text-sm transition-colors min-h-[44px] sm:min-h-0 ${unit === u ? 'bg-[#3B82F6] text-white' : 'text-[#6B6B6B] hover:text-white'}`}
                                        >
                                            {u === 'serving' ? 'Srv' : u}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 text-white text-lg font-medium focus:outline-none focus:border-[#3B82F6]"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-sm text-[#A1A1A1] mb-2 block">Time</label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 text-white text-lg font-medium focus:outline-none focus:border-[#3B82F6]"
                            />
                        </div>
                    </div>

                    {/* Nutrition Preview */}
                    <div className="grid grid-cols-4 gap-2 sm:gap-3">
                        <div className="bg-[#141414] rounded-xl p-2.5 sm:p-3 text-center">
                            <p className="text-xs text-[#6B6B6B] mb-1">Cals</p>
                            <p className="text-white font-semibold text-sm sm:text-base">{nutrition.calories}</p>
                        </div>
                        <div className="bg-[#141414] rounded-xl p-2.5 sm:p-3 text-center">
                            <p className="text-xs text-[#EF4444] mb-1">Prot</p>
                            <p className="text-white font-semibold text-sm sm:text-base">{nutrition.protein}g</p>
                        </div>
                        <div className="bg-[#141414] rounded-xl p-2.5 sm:p-3 text-center">
                            <p className="text-xs text-[#10B981] mb-1">Carb</p>
                            <p className="text-white font-semibold text-sm sm:text-base">{nutrition.carbs}g</p>
                        </div>
                        <div className="bg-[#141414] rounded-xl p-2.5 sm:p-3 text-center">
                            <p className="text-xs text-[#F59E0B] mb-1">Fat</p>
                            <p className="text-white font-semibold text-sm sm:text-base">{nutrition.fat}g</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        {onDelete && (
                            <Button
                                variant="secondary"
                                className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 min-h-[48px]"
                                onClick={() => {
                                    if (confirm(`Are you sure you want to delete ${entries.length > 1 ? 'these entries' : 'this entry'}?`)) {
                                        onDelete(entries.map(e => e.id));
                                        onClose();
                                    }
                                }}
                            >
                                Delete
                            </Button>
                        )}
                        <Button
                            className="flex-[2] min-h-[48px]"
                            onClick={handleSave}
                            disabled={currentGrams <= 0}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
