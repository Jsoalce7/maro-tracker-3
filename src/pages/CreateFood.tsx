import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFood } from '../hooks/useFood';
import { FoodItem } from '../types';
import { BarcodeScanner } from '../components/common/BarcodeScanner';
import { NutritionLabelScanner } from '../components/common/NutritionLabelScanner';
import { useBarcodeLookup } from '../hooks/useBarcodeLookup';
import { useNutritionLabelOCR } from '../hooks/useNutritionLabelOCR';

export function CreateFood() {
    const navigate = useNavigate();
    const location = useLocation();
    const { createCustomFood, updateCustomFood, deleteCustomFood, allCustomFoods } = useFood();

    // Scanners
    const { fetchProduct, isLoading: isLookingUp } = useBarcodeLookup();
    const { parseLabel, isLoading: isOCRProcessing } = useNutritionLabelOCR();
    const [scanningMode, setScanningMode] = useState<'none' | 'barcode' | 'label'>('none');

    const editFood = location.state?.editFood as FoodItem | undefined;
    const isEditing = !!editFood;

    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [manualForm, setManualForm] = useState({
        name: '',
        brand: '',
        serving_size_g: '100',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',

        // Micros & Advanced
        sugar: '',
        added_sugar: '', // New
        fiber: '',
        saturated_fat: '',
        trans_fat: '',   // New
        cholesterol: '', // New
        sodium: '',
        potassium: '',   // New
        calcium: '',     // New
        iron: '',        // New
        vitamin_d: '',   // New
        caffeine: '',

        barcode: '',
        // Metadata
        category: '',
        ingredient_type: '',
        sub_category: '',
        source: '',
        processing_level: '',
        tags: [] as string[],
        tagInput: '',
        restaurant: '',
    });

    const [servingUnit, setServingUnit] = useState<'g' | 'oz' | 'fl oz' | 'ml' | 'tsp' | 'tbsp'>('g');
    const [showMicros, setShowMicros] = useState(false);

    // Initial Load for Edit
    useEffect(() => {
        if (editFood) {
            const sizeInGrams = editFood.serving_size_g || 100;
            let displaySize = sizeInGrams;
            let unit: 'g' | 'oz' | 'ml' = 'g';

            if (editFood.serving_unit === 'oz') {
                displaySize = sizeInGrams / 28.3495;
                unit = 'oz';
            } else if (editFood.serving_unit === 'ml') {
                unit = 'ml';
            }

            setServingUnit(unit);

            const ratio = sizeInGrams / 100; // Factor to convert per-100g TO per-serving (based on grams)

            setManualForm({
                name: editFood.name,
                brand: editFood.brand || '',
                serving_size_g: Number(displaySize.toFixed(1)).toString(), // Display standardized value
                calories: (editFood.calories_per_100g * ratio).toString(),
                protein: (editFood.protein_per_100g * ratio).toString(),
                carbs: (editFood.carbs_per_100g * ratio).toString(),
                fat: (editFood.fat_per_100g * ratio).toString(),

                // Micros
                sugar: editFood.sugar_per_100g ? (editFood.sugar_per_100g * ratio).toString() : '',
                added_sugar: editFood.added_sugar_per_100g ? (editFood.added_sugar_per_100g * ratio).toString() : '',
                fiber: editFood.fiber_per_100g ? (editFood.fiber_per_100g * ratio).toString() : '',
                saturated_fat: editFood.saturated_fat_per_100g ? (editFood.saturated_fat_per_100g * ratio).toString() : '',
                trans_fat: editFood.trans_fat_per_100g ? (editFood.trans_fat_per_100g * ratio).toString() : '',
                cholesterol: editFood.cholesterol_per_100g ? (editFood.cholesterol_per_100g * ratio).toString() : '',
                sodium: editFood.sodium_per_100g ? (editFood.sodium_per_100g * ratio).toString() : '',
                potassium: editFood.potassium_per_100g ? (editFood.potassium_per_100g * ratio).toString() : '',
                calcium: editFood.calcium_per_100g ? (editFood.calcium_per_100g * ratio).toString() : '',
                iron: editFood.iron_per_100g ? (editFood.iron_per_100g * ratio).toString() : '',
                vitamin_d: editFood.vitamin_d_per_100g ? (editFood.vitamin_d_per_100g * ratio).toString() : '',
                caffeine: editFood.caffeine_mg ? (editFood.caffeine_mg * ratio).toString() : '',

                barcode: editFood.barcode || '',
                category: editFood.category || '',
                ingredient_type: editFood.ingredient_type || '',
                sub_category: editFood.sub_category || '',
                source: editFood.source || '',
                processing_level: editFood.processing_level || '',
                tags: editFood.tags || [],
                tagInput: '',
                restaurant: editFood.restaurant || '',
            });

            // Auto-expand if any advanced fields are present
            if (editFood.sugar_per_100g || editFood.fiber_per_100g || editFood.saturated_fat_per_100g || editFood.sodium_per_100g ||
                editFood.added_sugar_per_100g || editFood.trans_fat_per_100g || editFood.cholesterol_per_100g ||
                editFood.potassium_per_100g || editFood.calcium_per_100g || editFood.iron_per_100g || editFood.vitamin_d_per_100g
            ) {
                setShowMicros(true);
            }
        }
    }, [editFood]);


    const [foundFoodConflict, setFoundFoodConflict] = useState<FoodItem | null>(null);
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    const handleBarcodeDetected = async (code: string) => {
        setScanningMode('none');

        // Check local library first
        const existingLocal = allCustomFoods?.find(f => f.barcode === code);
        if (existingLocal) {
            setFoundFoodConflict(existingLocal);
            return;
        }

        // Pre-fill form from barcode (OpenFoodFacts)
        const food = await fetchProduct(code);
        if (food) {
            setManualForm(prev => ({
                ...prev,
                name: food.name || '',
                brand: food.brand || '',
                ingredient_type: prev.ingredient_type,
                serving_size_g: (food.serving_size_g || 100).toString(),
                calories: ((food.calories_per_100g || 0) * ((food.serving_size_g || 100) / 100)).toString(),
                protein: ((food.protein_per_100g || 0) * ((food.serving_size_g || 100) / 100)).toString(),
                carbs: ((food.carbs_per_100g || 0) * ((food.serving_size_g || 100) / 100)).toString(),
                fat: ((food.fat_per_100g || 0) * ((food.serving_size_g || 100) / 100)).toString(),
                barcode: code,
            }));
            setServingUnit('g'); // Default to g for scanned items usually
        } else {
            setManualForm(prev => ({ ...prev, barcode: code }));
            alert("Product not found. You can add it manually.");
        }
    };


    const [missingFields, setMissingFields] = useState<string[]>([]);

    const handleLabelCaptured = async (image: string) => {
        const data = await parseLabel(image);
        if (data) {
            const serving = data.serving_size_g || 100;
            const ratio = 100 / serving;

            // Check for explicit nulls (missing values)
            const missing: string[] = [];
            // @ts-ignore
            if (data.fiber === null) missing.push('fiber');
            // @ts-ignore
            if (data.sugar === null) missing.push('sugar');
            // Check new fields if needed, but primarily fiber/sugar are standard warnings.
            // Let's add Added Sugar warning if missing
            // @ts-ignore
            if (data.added_sugar === null) missing.push('added_sugar');

            setMissingFields(missing);

            // Auto-expand advanced section
            setShowMicros(true);

            setManualForm(prev => ({
                ...prev,
                name: data.name || prev.name,
                brand: data.brand || prev.brand,
                ingredient_type: prev.ingredient_type,
                serving_size_g: serving.toString(),
                calories: (data.calories || 0).toString(),
                protein: (data.protein || 0).toString(),
                carbs: (data.carbs || 0).toString(),
                fat: (data.fat || 0).toString(),

                // Use nullish coalescing: if null (missing), set strict empty string. If undefined (not found), set empty.
                sugar: (data.sugar !== null && data.sugar !== undefined) ? data.sugar.toString() : '',
                added_sugar: (data.added_sugar !== null && data.added_sugar !== undefined) ? data.added_sugar.toString() : '',
                fiber: (data.fiber !== null && data.fiber !== undefined) ? data.fiber.toString() : '',

                saturated_fat: (data.saturated_fat || '').toString(),
                trans_fat: (data.trans_fat || '').toString(),
                cholesterol: (data.cholesterol || '').toString(),
                sodium: (data.sodium || '').toString(),
                potassium: (data.potassium || '').toString(),
                calcium: (data.calcium || '').toString(),
                iron: (data.iron || '').toString(),
                vitamin_d: (data.vitamin_d || '').toString(),
            }));
            setScanningMode('none');
        }
    };


    const handleSave = async () => {
        if (!manualForm.name || !manualForm.calories) {
            alert("Please enter at least a name and calories.");
            return;
        }

        // Safety Prompt for Missing Fields (Only checks critical ones: Fiber, Sugar, Added Sugar)
        const criticalFields = ['fiber', 'sugar', 'added_sugar'];
        const stillMissing = missingFields.filter(field =>
            criticalFields.includes(field) && !manualForm[field as keyof typeof manualForm]
        );

        if (stillMissing.length > 0) {
            if (!confirm(`Warning: The following fields were not found on the label:\n\n${stillMissing.join(', ')}\n\nDo you want to save them as 0?`)) {
                return;
            }
        }

        setIsSaving(true);
        try {
            const servingSize = parseFloat(manualForm.serving_size_g) || 100;
            // Determine ratio to convert to per-100g
            let servingSizeInGrams = servingSize;
            if (servingUnit === 'oz') servingSizeInGrams = servingSize * 28.3495;
            if (servingUnit === 'fl oz') servingSizeInGrams = servingSize * 29.5735;
            if (servingUnit === 'ml') servingSizeInGrams = servingSize; // approx

            const ratio = 100 / servingSizeInGrams;

            const foodData: Omit<FoodItem, 'id'> = {
                name: manualForm.name,
                brand: manualForm.brand,
                serving_size_g: servingSizeInGrams,

                // Convert entered values (per serving) to per-100g
                calories_per_100g: (parseFloat(manualForm.calories) || 0) * ratio,
                protein_per_100g: (parseFloat(manualForm.protein) || 0) * ratio,
                carbs_per_100g: (parseFloat(manualForm.carbs) || 0) * ratio,
                fat_per_100g: (parseFloat(manualForm.fat) || 0) * ratio,

                // Micros
                sugar_per_100g: manualForm.sugar ? (parseFloat(manualForm.sugar) || 0) * ratio : undefined,
                added_sugar_per_100g: manualForm.added_sugar ? (parseFloat(manualForm.added_sugar) || 0) * ratio : undefined,
                fiber_per_100g: manualForm.fiber ? (parseFloat(manualForm.fiber) || 0) * ratio : undefined,
                saturated_fat_per_100g: manualForm.saturated_fat ? (parseFloat(manualForm.saturated_fat) || 0) * ratio : undefined,
                trans_fat_per_100g: manualForm.trans_fat ? (parseFloat(manualForm.trans_fat) || 0) * ratio : undefined,
                cholesterol_per_100g: manualForm.cholesterol ? (parseFloat(manualForm.cholesterol) || 0) * ratio : undefined,
                sodium_per_100g: manualForm.sodium ? (parseFloat(manualForm.sodium) || 0) * ratio : undefined,
                potassium_per_100g: manualForm.potassium ? (parseFloat(manualForm.potassium) || 0) * ratio : undefined,
                calcium_per_100g: manualForm.calcium ? (parseFloat(manualForm.calcium) || 0) * ratio : undefined,
                iron_per_100g: manualForm.iron ? (parseFloat(manualForm.iron) || 0) * ratio : undefined,
                vitamin_d_per_100g: manualForm.vitamin_d ? (parseFloat(manualForm.vitamin_d) || 0) * ratio : undefined,
                caffeine_mg: manualForm.caffeine ? (parseFloat(manualForm.caffeine) || 0) * ratio : 0,

                barcode: manualForm.barcode || undefined,

                // Metadata
                category: manualForm.category || undefined,
                ingredient_type: manualForm.category === 'Ingredients' ? (manualForm.ingredient_type || 'Misc') : undefined,
                sub_category: (manualForm.category === 'Ingredients' || manualForm.category === 'Fruit' || manualForm.category === 'Vegetable') ? manualForm.sub_category : undefined,
                source: manualForm.source || undefined,
                processing_level: manualForm.processing_level || undefined,
                tags: manualForm.tags.length > 0 ? manualForm.tags : undefined,
                restaurant: manualForm.category === 'Fast Food' ? manualForm.restaurant : undefined,
                serving_unit: servingUnit, // Save the preferred unit
            };

            if (isEditing && editFood) {
                await updateCustomFood({ foodId: editFood.id, updates: foodData });
            } else {
                await createCustomFood(foodData);
            }

            navigate(-1); // Go back
        } catch (e) {
            console.error(e);
            alert(`Failed to ${isEditing ? 'update' : 'create'} food`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        // ... (existing delete code)
        if (!isEditing || !editFood?.id) return;
        if (!confirm("Are you sure you want to delete this food? This cannot be undone.")) return;

        setIsSaving(true);
        try {
            await deleteCustomFood(editFood.id);
            navigate(-1);
        } catch (error) {
            console.error("Failed to delete food:", error);
            alert("Failed to delete food. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // Helper for rendering inputs
    const renderMicroInput = (label: string, field: keyof typeof manualForm, unit: string = 'g') => {
        const isMissing = missingFields.includes(field as string);
        return (
            <div key={label} className={`bg-[#141414] p-3 rounded-xl border ${isMissing ? 'border-red-500 bg-red-500/10' : 'border-[#2A2A2A]'}`}>
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-[#6B6B6B] block truncate pr-1" title={label}>{label} ({unit})</label>
                    {isMissing && <span className="text-[10px] text-red-400 font-bold tracking-wide uppercase">Missing</span>}
                </div>
                <input
                    type="number"
                    placeholder="0"
                    value={manualForm[field] as string}
                    onChange={e => {
                        setManualForm(prev => ({ ...prev, [field]: e.target.value }));
                        if (isMissing) setMissingFields(prev => prev.filter(f => f !== field));
                    }}
                    className="w-full bg-transparent text-white text-xl font-bold placeholder-[#333] focus:outline-none"
                />
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#141414] flex flex-col text-white ios-pwa-layout-fix p-4 safe-area-inset-bottom relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-bold">{isEditing ? 'Edit Food' : 'Create Food'}</h1>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setScanningMode('barcode')} className="p-2 bg-[#2A2A2A] rounded-lg hover:bg-[#333] transition-colors">
                        <svg className="w-5 h-5 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                    </button>
                    <button onClick={() => setScanningMode('label')} className="p-2 bg-[#2A2A2A] rounded-lg hover:bg-[#333] transition-colors">
                        <svg className="w-5 h-5 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    {(isEditing && editFood?.is_custom) && (
                        <button
                            onClick={handleDelete}
                            disabled={isSaving}
                            className="bg-[#2A2A2A] hover:bg-red-900/20 text-red-500 font-semibold px-3 py-1.5 rounded-lg ml-2 transition-all text-sm"
                        >
                            Delete
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="text-[#3B82F6] font-semibold disabled:opacity-50 ml-2"
                    >
                        {isSaving ? '...' : 'Save'}
                    </button>
                </div>
            </div>

            <div className="space-y-6 max-w-lg mx-auto pb-20">
                {/* Basic Info */}
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-[#6B6B6B] uppercase font-semibold tracking-wider mb-2 block">Details</label>
                        <input
                            type="text"
                            placeholder="Food Name (e.g. Banana)"
                            value={manualForm.name}
                            onChange={e => setManualForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 text-white text-lg placeholder-[#6B6B6B] focus:outline-none focus:border-[#3B82F6] mb-3"
                        />
                        <input
                            type="text"
                            list="brands-list"
                            placeholder="Brand (optional)"
                            value={manualForm.brand}
                            onChange={e => setManualForm(prev => ({ ...prev, brand: e.target.value }))}
                            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-3 text-white focus:outline-none focus:border-[#3B82F6]"
                        />
                        <datalist id="brands-list">
                            {Array.from(new Set(allCustomFoods?.map(f => f.brand).filter(Boolean))).sort().map(b => (
                                <option key={b} value={b} />
                            ))}
                        </datalist>

                        <div className="mt-3">
                            <label className="text-xs text-[#6B6B6B] block mb-1">UPC / Barcode (optional)</label>
                            <div className="flex gap-2">
                                <input
                                    ref={barcodeInputRef}
                                    type="text"
                                    placeholder="Scan or enter barcode"
                                    value={manualForm.barcode}
                                    onChange={e => {
                                        setManualForm(prev => ({ ...prev, barcode: e.target.value.trim() }))
                                    }}
                                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-3 text-white focus:outline-none focus:border-[#3B82F6]"
                                />
                                <button
                                    onClick={() => setScanningMode('barcode')}
                                    className="p-3 bg-[#2A2A2A] rounded-xl hover:bg-[#333] transition-colors"
                                    title="Scan Barcode"
                                >
                                    <svg className="w-6 h-6 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Serving Size */}
                <div>
                    <label className="text-xs text-[#6B6B6B] uppercase font-semibold tracking-wider mb-2 block">Serving Size</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={manualForm.serving_size_g}
                            onChange={e => setManualForm(prev => ({ ...prev, serving_size_g: e.target.value }))}
                            className="flex-1 bg-[#141414] border border-[#2A2A2A] rounded-xl p-3 text-white text-lg focus:outline-none focus:border-[#3B82F6]"
                        />
                        <div className="flex-1">
                            <select
                                value={servingUnit}
                                onChange={e => setServingUnit(e.target.value as any)}
                                className="w-full bg-[#141414] text-white p-3 rounded-xl border border-[#2A2A2A] focus:outline-none appearance-none"
                            >
                                <option value="g">grams (g)</option>
                                <option value="serving">serving</option>
                                {manualForm.category === 'Drink' ? (
                                    <>
                                        <option value="fl oz">fl oz</option>
                                        <option value="ml">ml</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="oz">oz (weight)</option>
                                        <option value="ml">ml</option>
                                        <option value="tsp">tsp</option>
                                        <option value="tbsp">tbsp</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Macros */}
                    <div>
                        <label className="text-xs text-[#6B6B6B] uppercase font-semibold tracking-wider mb-2 block">Nutrition (per serving)</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#141414] p-3 rounded-xl border border-[#2A2A2A]">
                                <label className="text-xs text-[#6B6B6B] block mb-1">Calories</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={manualForm.calories}
                                    onChange={e => setManualForm(prev => ({ ...prev, calories: e.target.value }))}
                                    className="w-full bg-transparent text-white text-2xl font-bold placeholder-[#333] focus:outline-none"
                                />
                            </div>
                            <div className="bg-[#141414] p-3 rounded-xl border border-[#2A2A2A]">
                                <label className="text-xs text-[#6B6B6B] block mb-1">Protein (g)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={manualForm.protein}
                                    onChange={e => setManualForm(prev => ({ ...prev, protein: e.target.value }))}
                                    className="w-full bg-transparent text-white text-2xl font-bold placeholder-[#333] focus:outline-none"
                                />
                            </div>
                            <div className="bg-[#141414] p-3 rounded-xl border border-[#2A2A2A]">
                                <label className="text-xs text-[#6B6B6B] block mb-1">Carbs (g)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={manualForm.carbs}
                                    onChange={e => setManualForm(prev => ({ ...prev, carbs: e.target.value }))}
                                    className="w-full bg-transparent text-white text-2xl font-bold placeholder-[#333] focus:outline-none"
                                />
                            </div>
                            <div className="bg-[#141414] p-3 rounded-xl border border-[#2A2A2A]">
                                <label className="text-xs text-[#6B6B6B] block mb-1">Fat (g)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={manualForm.fat}
                                    onChange={e => setManualForm(prev => ({ ...prev, fat: e.target.value }))}
                                    className="w-full bg-transparent text-white text-2xl font-bold placeholder-[#333] focus:outline-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => setShowMicros(!showMicros)}
                            className="text-[#3B82F6] text-sm font-medium mt-3 flex items-center gap-1"
                        >
                            {showMicros ? 'Hide Advanced' : 'Show Advanced (Micros, Vitamins...)'}
                        </button>

                        {showMicros && (
                            <div className="grid grid-cols-2 gap-3 mt-3 animate-slide-up">
                                {renderMicroInput('Sugar', 'sugar')}
                                {renderMicroInput('Added Sugar', 'added_sugar')}
                                {renderMicroInput('Fiber', 'fiber')}
                                {renderMicroInput('Sat. Fat', 'saturated_fat')}
                                {renderMicroInput('Trans Fat', 'trans_fat')}
                                {renderMicroInput('Cholesterol', 'cholesterol', 'mg')}
                                {renderMicroInput('Sodium', 'sodium', 'mg')}
                                {renderMicroInput('Potassium', 'potassium', 'mg')}
                                {renderMicroInput('Calcium', 'calcium', 'mg')}
                                {renderMicroInput('Iron', 'iron', 'mg')}
                                {renderMicroInput('Vitamin D', 'vitamin_d', 'mcg')}
                            </div>
                        )}
                    </div>

                    {/* Organization */}
                    <div className="space-y-5 pt-4 border-t border-[#2A2A2A]">
                        <h3 className="text-[#6B6B6B] uppercase text-xs font-semibold tracking-wider">Organization</h3>

                        {/* Category */}
                        <div>
                            <label className="text-xs text-[#6B6B6B] mb-2 block">Category (Required)</label>
                            <div className="flex flex-wrap gap-2">
                                {['Meal', 'Snack', 'Drink', 'Ingredients', 'Fruit', 'Vegetable', 'Fast Food', 'Supplement', 'Other'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setManualForm(prev => ({ ...prev, category: cat }))}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${manualForm.category === cat ? 'bg-[#3B82F6] text-white' : 'bg-[#2A2A2A] text-[#A1A1A1] hover:text-white'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ingredient Type Selection */}
                        {manualForm.category === 'Ingredients' && (
                            <div className="animate-slide-up mt-4">
                                <label className="text-xs text-[#6B6B6B] mb-2 block">Ingredient Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Protein', 'Dairy', 'Carbs', 'Fats', 'Condiments', 'Spices', 'Misc'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                let defaultSub = '';
                                                if (['Protein', 'Dairy', 'Carbs', 'Fats'].includes(type)) {
                                                    defaultSub = `All ${type}`;
                                                }
                                                setManualForm(prev => ({ ...prev, ingredient_type: type, sub_category: defaultSub }));
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${manualForm.ingredient_type === type ? 'bg-[#3B82F6] text-white' : 'bg-[#2A2A2A] text-[#A1A1A1] hover:text-white'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Ingredient Sub-Type (2nd Level) */}
                        {manualForm.category === 'Ingredients' && manualForm.ingredient_type && (
                            (() => {
                                let subtypes: string[] = [];
                                if (manualForm.ingredient_type === 'Carbs') subtypes = ['All Carbs', 'Bread', 'Pasta', 'Tortillas', 'Grains'];
                                if (manualForm.ingredient_type === 'Fats') subtypes = ['All Fats', 'Butter', 'Oil'];
                                if (manualForm.ingredient_type === 'Dairy') subtypes = ['All Dairy', 'Milk', 'Cheese', 'Yogurt'];
                                if (manualForm.ingredient_type === 'Protein') subtypes = ['All Protein', 'White Meat', 'Red Meat', 'Egg', 'Plant Protein'];

                                if (subtypes.length === 0) return null;

                                return (
                                    <div className="animate-slide-up mt-4 pl-4 border-l-2 border-[#2A2A2A]">
                                        <label className="text-xs text-[#6B6B6B] mb-2 block">Specific Type</label>
                                        <div className="flex flex-wrap gap-2">
                                            {subtypes.map(sub => (
                                                <button
                                                    key={sub}
                                                    onClick={() => setManualForm(prev => ({ ...prev, sub_category: sub }))}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${manualForm.sub_category === sub ? 'bg-[#3B82F6] text-white' : 'bg-[#2A2A2A] text-[#A1A1A1] hover:text-white'}`}
                                                >
                                                    {sub}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()
                        )}

                        {/* Fruit & Vegetable Sub-Categories */}
                        {(manualForm.category === 'Fruit' || manualForm.category === 'Vegetable') && (
                            <div className="animate-slide-up mt-4">
                                <label className="text-xs text-[#6B6B6B] mb-2 block">Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Fresh', 'Frozen', 'Dried', 'Canned'].map(sub => (
                                        <button
                                            key={sub}
                                            onClick={() => setManualForm(prev => ({ ...prev, sub_category: sub }))}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${manualForm.sub_category === sub ? 'bg-[#3B82F6] text-white' : 'bg-[#2A2A2A] text-[#A1A1A1] hover:text-white'}`}
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}


                        {/* Caffeine Input for Drinks */}
                        {manualForm.category === 'Drink' && (
                            <div className="animate-slide-up mt-4 bg-[#141414] p-3 rounded-xl border border-[#2A2A2A]">
                                <label className="text-xs text-[#6B6B6B] block mb-1">Caffeine (mg) - Per Serving</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={manualForm.caffeine}
                                    onChange={e => setManualForm(prev => ({ ...prev, caffeine: e.target.value }))}
                                    className="w-full bg-transparent text-white text-xl font-bold placeholder-[#333] focus:outline-none"
                                />
                            </div>
                        )}

                        {/* Fast Food: Restaurant Selection */}
                        {manualForm.category === 'Fast Food' && (
                            <div className="animate-slide-up">
                                <label className="text-xs text-[#6B6B6B] mb-2 block">Restaurant</label>
                                <input
                                    type="text"
                                    list="restaurants-list"
                                    placeholder="e.g. McDonald's"
                                    value={manualForm.restaurant}
                                    onChange={e => setManualForm(prev => ({ ...prev, restaurant: e.target.value }))}
                                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-3 text-white focus:outline-none focus:border-[#3B82F6]"
                                />
                                <datalist id="restaurants-list">
                                    {Array.from(new Set(allCustomFoods?.map(f => f.restaurant).filter(Boolean))).sort().map(r => (
                                        <option key={r} value={r} />
                                    ))}
                                </datalist>
                            </div>
                        )}

                        {/* Drink Type Selection */}
                        {manualForm.category === 'Drink' && (
                            <div className="animate-slide-up">
                                <label className="text-xs text-[#6B6B6B] mb-2 block">Drink Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Water', 'Coffee', 'Tea', 'Soda', 'Juice', 'Smoothie', 'Protein Shake', 'Energy Drink', 'Alcohol'].map(type => {
                                        const isActive = manualForm.tags.includes(type);
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => {
                                                    setManualForm(prev => {
                                                        const types = ['Water', 'Coffee', 'Tea', 'Soda', 'Juice', 'Smoothie', 'Protein Shake', 'Energy Drink', 'Alcohol'];
                                                        const newTags = prev.tags.filter(t => !types.includes(t));
                                                        if (!isActive) newTags.push(type);
                                                        return { ...prev, tags: newTags };
                                                    });
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isActive ? 'bg-[#3B82F6] text-white' : 'bg-[#2A2A2A] text-[#A1A1A1] hover:text-white'}`}
                                            >
                                                {type}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Snack Type Selection */}
                        {manualForm.category === 'Snack' && (
                            <div className="animate-slide-up">
                                <label className="text-xs text-[#6B6B6B] mb-2 block">Snack Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Chips', 'Cookies', 'Candy', 'Dessert', 'Protein Bar', 'Nut', 'Other'].map(type => {
                                        const isActive = manualForm.tags.includes(type);
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => {
                                                    setManualForm(prev => {
                                                        const types = ['Chips', 'Cookies', 'Candy', 'Dessert', 'Protein Bar', 'Nut', 'Other'];
                                                        const newTags = prev.tags.filter(t => !types.includes(t));
                                                        if (!isActive) newTags.push(type);
                                                        return { ...prev, tags: newTags };
                                                    });
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isActive ? 'bg-[#3B82F6] text-white' : 'bg-[#2A2A2A] text-[#A1A1A1] hover:text-white'}`}
                                            >
                                                {type}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Source */}
                        <div>
                            <label className="text-xs text-[#6B6B6B] mb-2 block">Source</label>
                            <div className="flex flex-wrap gap-2">
                                {['Home-cooked', 'Packaged snack', 'Restaurant', 'Fast food chain', 'Coffee shop', 'Other'].map(src => (
                                    <button
                                        key={src}
                                        onClick={() => setManualForm(prev => ({ ...prev, source: src }))}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${manualForm.source === src ? 'bg-[#10B981] text-white' : 'bg-[#2A2A2A] text-[#A1A1A1] hover:text-white'}`}
                                    >
                                        {src}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="text-xs text-[#6B6B6B] mb-2 block">Tags</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {manualForm.tags.map(tag => (
                                    <span key={tag} className="px-2 py-1 rounded bg-[#3B82F6]/20 text-[#3B82F6] text-xs flex items-center gap-1">
                                        {tag}
                                        <button onClick={() => setManualForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}>×</button>
                                    </span>
                                ))}
                            </div>
                            <input
                                type="text"
                                placeholder="Add tag (press enter)"
                                value={manualForm.tagInput}
                                onChange={e => setManualForm(prev => ({ ...prev, tagInput: e.target.value }))}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (manualForm.tagInput.trim()) {
                                            setManualForm(prev => ({
                                                ...prev,
                                                tags: [...prev.tags, prev.tagInput.trim()],
                                                tagInput: ''
                                            }));
                                        }
                                    }
                                }}
                                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-3 text-white focus:outline-none focus:border-[#3B82F6]"
                            />
                        </div>
                    </div>
                </div>
                {/* Scanner Overlay */}
                {scanningMode !== 'none' && (
                    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4">
                        <div className="w-full max-w-md h-[70vh] relative">
                            <button onClick={() => setScanningMode('none')} className="absolute top-0 right-0 z-10 p-2 text-white">✕</button>
                            {scanningMode === 'barcode' && (
                                <BarcodeScanner
                                    onDetected={handleBarcodeDetected}
                                    onClose={() => setScanningMode('none')}
                                    onManualInput={() => {
                                        setScanningMode('none');
                                        setTimeout(() => barcodeInputRef.current?.focus(), 100);
                                    }}
                                />
                            )}
                            {scanningMode === 'label' && (
                                <NutritionLabelScanner
                                    onCapture={handleLabelCaptured}
                                    onClose={() => setScanningMode('none')}
                                    isProcessing={isOCRProcessing}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Conflict Modal */}
            {foundFoodConflict && (
                <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-[#1C1C1E] rounded-2xl w-full max-w-sm overflow-hidden border border-[#2C2C2E]">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-[#3B82F6]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Item Found!</h3>
                            <p className="text-gray-400 mb-6">
                                We found <strong>{foundFoodConflict.name}</strong> in your library.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        navigate(`/add-food?initialFoodId=${foundFoodConflict.id}&mode=add`);
                                    }}
                                    className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white py-3 rounded-xl font-semibold transition-colors"
                                >
                                    Log This Item
                                </button>
                                <button
                                    onClick={() => {
                                        const food = foundFoodConflict;
                                        const sizeInGrams = food.serving_size_g || 100;
                                        setServingUnit('g');
                                        setManualForm(prev => ({
                                            ...prev,
                                            name: food.name,
                                            brand: food.brand || '',
                                            serving_size_g: sizeInGrams.toString(),
                                            calories: (food.calories_per_100g * (sizeInGrams / 100)).toString(),
                                            protein: (food.protein_per_100g * (sizeInGrams / 100)).toString(),
                                            carbs: (food.carbs_per_100g * (sizeInGrams / 100)).toString(),
                                            fat: (food.fat_per_100g * (sizeInGrams / 100)).toString(),
                                            barcode: food.barcode || '',
                                            sugar: food.sugar_per_100g ? (food.sugar_per_100g * (sizeInGrams / 100)).toString() : '',
                                            added_sugar: food.added_sugar_per_100g ? (food.added_sugar_per_100g * (sizeInGrams / 100)).toString() : '',
                                            fiber: food.fiber_per_100g ? (food.fiber_per_100g * (sizeInGrams / 100)).toString() : '',
                                            saturated_fat: food.saturated_fat_per_100g ? (food.saturated_fat_per_100g * (sizeInGrams / 100)).toString() : '',
                                            trans_fat: food.trans_fat_per_100g ? (food.trans_fat_per_100g * (sizeInGrams / 100)).toString() : '',
                                            cholesterol: food.cholesterol_per_100g ? (food.cholesterol_per_100g * (sizeInGrams / 100)).toString() : '',
                                            sodium: food.sodium_per_100g ? (food.sodium_per_100g * (sizeInGrams / 100)).toString() : '',
                                            potassium: food.potassium_per_100g ? (food.potassium_per_100g * (sizeInGrams / 100)).toString() : '',
                                            calcium: food.calcium_per_100g ? (food.calcium_per_100g * (sizeInGrams / 100)).toString() : '',
                                            iron: food.iron_per_100g ? (food.iron_per_100g * (sizeInGrams / 100)).toString() : '',
                                            vitamin_d: food.vitamin_d_per_100g ? (food.vitamin_d_per_100g * (sizeInGrams / 100)).toString() : '',
                                            caffeine: food.caffeine_mg ? (food.caffeine_mg * (sizeInGrams / 100)).toString() : '',
                                        }));
                                        setFoundFoodConflict(null);
                                    }}
                                    className="w-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white py-3 rounded-xl font-semibold transition-colors"
                                >
                                    Edit Details
                                </button>
                                <button
                                    onClick={() => setFoundFoodConflict(null)}
                                    className="w-full text-gray-400 py-2 text-sm font-medium"
                                >
                                    Cancel (Create New)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
