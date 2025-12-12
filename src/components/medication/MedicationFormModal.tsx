import { useState, useEffect } from 'react';
import { useMedication } from '../../hooks/useMedication';
import { ActiveIngredient } from '../../types/medication';

interface MedicationFormModalProps {
    onClose: () => void;
    editMedicationId?: string;
}

export function MedicationFormModal({ onClose, editMedicationId }: MedicationFormModalProps) {
    const today = new Date().toISOString().split('T')[0];
    const { addMedication, updateMedicationProfile, profiles } = useMedication(today);
    const isEdit = !!editMedicationId;
    const existingProfile = editMedicationId ? profiles.find(p => p.id === editMedicationId) : null;

    // Form State
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [strengthVal, setStrengthVal] = useState('');
    const [strengthUnit, setStrengthUnit] = useState('mg');
    const [form, setForm] = useState('tablet');

    // Toggles
    const [takeDaily, setTakeDaily] = useState(false); // Phase 4

    // Inventory - Phase 3
    const [currentStock, setCurrentStock] = useState('');
    const [lowStockWarning, setLowStockWarning] = useState('5');

    // Metadata
    const [categoryTags, setCategoryTags] = useState<string[]>([]);
    const [medicationTags, setMedicationTags] = useState<string[]>([]);
    const [ingredients, setIngredients] = useState<ActiveIngredient[]>([]);
    const [notes, setNotes] = useState('');

    // Load Data
    useEffect(() => {
        if (isEdit && existingProfile) {
            setName(existingProfile.name);
            setBrand(existingProfile.brand || '');
            setStrengthVal(existingProfile.strength_value?.toString() || '');
            setStrengthUnit(existingProfile.strength_unit || 'mg');
            setForm(existingProfile.form || 'tablet');
            setCategoryTags(existingProfile.category_tags || []);
            setMedicationTags(existingProfile.medication_tags || []);
            setIngredients(existingProfile.active_ingredients || []);
            setNotes(existingProfile.notes || '');
            setCurrentStock(existingProfile.current_stock?.toString() || '');
            setLowStockWarning(existingProfile.low_stock_threshold?.toString() || '5');
            setTakeDaily(existingProfile.take_daily || false);
        }
    }, [isEdit, existingProfile]);

    const handleSave = async () => {
        if (!name) return alert("Medication name is required.");

        const commonData = {
            name,
            brand: brand || undefined,
            tags: categoryTags,
            medication_tags: medicationTags,
            active_ingredients: ingredients,
            strength_val: strengthVal ? parseFloat(strengthVal) : undefined,
            strength_unit: strengthUnit,
            form,
            notes: notes || undefined,
            current_stock: currentStock ? parseInt(currentStock) : undefined,
            low_stock_threshold: lowStockWarning ? parseInt(lowStockWarning) : undefined,
            take_daily: takeDaily
        };

        try {
            if (isEdit && editMedicationId) {
                // Update
                // Note: The hook helper `updateMedicationProfile` expects `profileUpdates`.
                // We need to adhere to the Type.
                await updateMedicationProfile({
                    id: editMedicationId,
                    profileUpdates: {
                        name: commonData.name,
                        brand: commonData.brand,
                        category_tags: commonData.tags,
                        medication_tags: commonData.medication_tags,
                        active_ingredients: commonData.active_ingredients,
                        strength_value: commonData.strength_val,
                        strength_unit: commonData.strength_unit,
                        form: commonData.form,
                        notes: commonData.notes,
                        current_stock: commonData.current_stock,
                        low_stock_threshold: commonData.low_stock_threshold,
                        take_daily: commonData.take_daily
                    }
                });
            } else {
                // Create
                // Hook `addMedication` was designed for Phase 1. 
                // We might need to adjust it to accept `take_daily` and NO schedules.
                // Or we can treat `schedules` as empty array since it's optional in new paradigm?
                // Actually `useMedication` mutation expects `schedules` array.
                // We should pass empty array.
                // We also need to make sure `addMedication` handles `take_daily` in the profile part.
                await addMedication({
                    ...commonData,
                    schedules: [] // No schedules defined here anymore
                });
            }
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to save medication. Please check inputs.");
        }
    };

    const toggleCat = (cat: string) => {
        setCategoryTags(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
    };

    const toggleMedTag = (tag: string) => {
        setMedicationTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const addIngredient = () => setIngredients([...ingredients, { name: '', amount: 0, unit: 'mg' }]);
    const updateIngredient = (idx: number, field: keyof ActiveIngredient, val: string | number) => {
        const newIng = [...ingredients];
        newIng[idx] = { ...newIng[idx], [field]: val };
        setIngredients(newIng);
    };
    const removeIngredient = (idx: number) => setIngredients(ingredients.filter((_, i) => i !== idx));


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1C1C1E] w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-[#2C2C2E]">

                {/* Header */}
                <div className="p-6 border-b border-[#2C2C2E] flex justify-between items-center bg-[#1C1C1E]">
                    <h2 className="text-2xl font-bold">{isEdit ? 'Edit Medication' : 'Add Medication'}</h2>
                    <button onClick={onClose} className="p-2 bg-[#2C2C2E] rounded-full hover:bg-[#3A3A3C]">
                        <svg className="w-5 h-5 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    {/* 1. Basic Info */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[#8E8E93] text-xs font-bold uppercase tracking-wider mb-2">Name</label>
                                <input
                                    autoFocus
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Advil"
                                    className="w-full bg-[#2C2C2E] border-none rounded-xl py-3 px-4 text-white placeholder-[#5C5C5E] focus:ring-2 focus:ring-[#0A84FF]"
                                />
                            </div>
                            <div>
                                <label className="block text-[#8E8E93] text-xs font-bold uppercase tracking-wider mb-2">Brand (Optional)</label>
                                <input
                                    value={brand}
                                    onChange={e => setBrand(e.target.value)}
                                    placeholder="e.g. Pfizer"
                                    className="w-full bg-[#2C2C2E] border-none rounded-xl py-3 px-4 text-white placeholder-[#5C5C5E] focus:ring-2 focus:ring-[#0A84FF]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[#8E8E93] text-xs font-bold uppercase tracking-wider mb-2">Strength</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={strengthVal}
                                        onChange={e => setStrengthVal(e.target.value)}
                                        placeholder="500"
                                        className="w-full bg-[#2C2C2E] border-none rounded-xl py-3 px-4 text-white placeholder-[#5C5C5E] focus:ring-2 focus:ring-[#0A84FF]"
                                    />
                                    <select
                                        value={strengthUnit}
                                        onChange={e => setStrengthUnit(e.target.value)}
                                        className="bg-[#2C2C2E] text-white border-none rounded-xl px-2 text-sm focus:ring-2 focus:ring-[#0A84FF]"
                                    >
                                        <option value="mg">mg</option>
                                        <option value="mcg">mcg</option>
                                        <option value="g">g</option>
                                        <option value="IU">IU</option>
                                        <option value="ml">ml</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[#8E8E93] text-xs font-bold uppercase tracking-wider mb-2">Form</label>
                                <select
                                    value={form}
                                    onChange={e => setForm(e.target.value)}
                                    className="w-full bg-[#2C2C2E] border-none rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-[#0A84FF]"
                                >
                                    <option value="tablet">Tablet</option>
                                    <option value="capsule">Capsule</option>
                                    <option value="liquid">Liquid</option>
                                    <option value="injection">Injection</option>
                                    <option value="gummy">Gummy</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 2. Schedule & Inventory */}
                    <div className="bg-[#2C2C2E]/50 p-4 rounded-2xl border border-[#2C2C2E] space-y-4">
                        {/* Take Daily Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-white">Example Plan: Take Daily?</h3>
                                <p className="text-xs text-[#8E8E93]">Appears on your checklist every day</p>
                            </div>
                            <button
                                onClick={() => setTakeDaily(!takeDaily)}
                                className={`w-14 h-8 rounded-full transition-colors relative ${takeDaily ? 'bg-[#30D158]' : 'bg-[#3A3A3C]'}`}
                            >
                                <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow-md ${takeDaily ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-[#3A3A3C] pt-4">
                            <div>
                                <label className="block text-[#8E8E93] text-xs font-bold uppercase tracking-wider mb-2">Current Stock</label>
                                <input
                                    type="number"
                                    value={currentStock}
                                    onChange={e => setCurrentStock(e.target.value)}
                                    placeholder="30"
                                    className="w-full bg-[#1C1C1E] border border-[#3A3A3C] rounded-xl py-2 px-4 text-white focus:ring-2 focus:ring-[#0A84FF]"
                                />
                            </div>
                            <div>
                                <label className="block text-[#8E8E93] text-xs font-bold uppercase tracking-wider mb-2">Low Alert At</label>
                                <input
                                    type="number"
                                    value={lowStockWarning}
                                    onChange={e => setLowStockWarning(e.target.value)}
                                    placeholder="5"
                                    className="w-full bg-[#1C1C1E] border border-[#3A3A3C] rounded-xl py-2 px-4 text-white focus:ring-2 focus:ring-[#0A84FF]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. Categories & Tags */}
                    <div>
                        <label className="block text-[#8E8E93] text-xs font-bold uppercase tracking-wider mb-3">Categories</label>
                        <div className="flex flex-wrap gap-2">
                            {['Prescription', 'Supplement', 'Vitamin', 'Painkiller', 'Antibiotic', 'OTC'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => toggleCat(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${categoryTags.includes(cat)
                                            ? 'bg-[#0A84FF] text-white'
                                            : 'bg-[#2C2C2E] text-[#8E8E93] hover:bg-[#3A3A3C]'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[#8E8E93] text-xs font-bold uppercase tracking-wider mb-3">Warnings / Tags</label>
                        <div className="flex flex-wrap gap-2">
                            {['Drowsy', 'Non-drowsy', 'Take with food', 'Empty stomach', 'Morning', 'Night'].map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleMedTag(tag)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${medicationTags.includes(tag)
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-[#2C2C2E] text-[#8E8E93] hover:bg-[#3A3A3C]'
                                        }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 4. Active Ingredients */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-[#8E8E93] text-xs font-bold uppercase tracking-wider">Active Ingredients</label>
                            <button onClick={addIngredient} className="text-[#0A84FF] text-xs font-bold hover:underline">+ Add Ingredient</button>
                        </div>
                        <div className="space-y-2">
                            {ingredients.map((ing, idx) => (
                                <div key={idx} className="flex gap-2 animate-in slide-in-from-left-2">
                                    <input
                                        value={ing.name}
                                        onChange={e => updateIngredient(idx, 'name', e.target.value)}
                                        placeholder="Name"
                                        className="flex-1 bg-[#2C2C2E] border-none rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-[#0A84FF]"
                                    />
                                    <input
                                        type="number"
                                        value={ing.amount}
                                        onChange={e => updateIngredient(idx, 'amount', parseFloat(e.target.value) || 0)}
                                        placeholder="Amt"
                                        className="w-20 bg-[#2C2C2E] border-none rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-[#0A84FF]"
                                    />
                                    <input
                                        value={ing.unit}
                                        onChange={e => updateIngredient(idx, 'unit', e.target.value)}
                                        placeholder="Unit"
                                        className="w-16 bg-[#2C2C2E] border-none rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-[#0A84FF]"
                                    />
                                    <button onClick={() => removeIngredient(idx)} className="text-red-400 p-2 hover:bg-red-500/10 rounded">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                            {ingredients.length === 0 && <p className="text-sm text-[#5C5C5E] italic">No ingredients listed.</p>}
                        </div>
                    </div>

                    {/* 5. Notes */}
                    <div>
                        <label className="block text-[#8E8E93] text-xs font-bold uppercase tracking-wider mb-2">Notes</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="e.g. Do not combine with alcohol"
                            className="w-full bg-[#2C2C2E] border-none rounded-xl py-3 px-4 text-white placeholder-[#5C5C5E] min-h-[80px] focus:ring-2 focus:ring-[#0A84FF]"
                        />
                    </div>

                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-[#2C2C2E] flex justify-end gap-3 bg-[#1C1C1E]">
                    <button onClick={onClose} className="px-6 py-3 rounded-full font-bold text-[#8E8E93] hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-[#0A84FF] hover:bg-[#007AFF] text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-[#0A84FF]/25"
                    >
                        {isEdit ? 'Save Changes' : 'Save Medication'}
                    </button>
                </div>

            </div>
        </div>
    );
}
