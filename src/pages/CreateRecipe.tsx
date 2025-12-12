
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFood } from '../hooks/useFood';
import { useRecipes } from '../hooks/useRecipes';
import { useNutrition } from '../hooks/useNutrition';
import { FoodItem, Recipe, RecipeIngredient, FoodEntry } from '../types';

import { DrinkTypeSelector } from '../components/nutrition/DrinkTypeSelector';

export function CreateRecipe() {
    const navigate = useNavigate();
    const location = useLocation();
    const { searchFoods } = useFood();


    // Safely destructure state or default
    const state = location.state || {};
    const { fromMeal, defaultName, editRecipe: stateEditRecipe } = state as {
        fromMeal?: FoodEntry[],
        defaultName?: string,
        editRecipe?: Recipe
    };

    // Use useRecipes hook to get fresh data and delete mutation
    const { recipes, createRecipe, updateRecipe, deleteRecipe } = useRecipes();

    // Determine log date for replacement logic (useNutrition)
    // If coming from a meal, use that meal's date. Otherwise today.
    const [logDate] = useState(() => {
        if (fromMeal && fromMeal.length > 0 && fromMeal[0].logged_at) {
            return fromMeal[0].logged_at.split('T')[0];
        }
        return new Date().toISOString().split('T')[0];
    });

    const { addEntry, deleteEntry } = useNutrition(logDate);

    // Determine if editing based on logic
    const isEditing = !!stateEditRecipe;

    // Attempt to find fresh recipe from cache/SWR if editing
    const freshRecipe = isEditing && stateEditRecipe?.id && recipes
        ? recipes.find(r => r.id === stateEditRecipe.id)
        : undefined;

    // Use freshRecipe if available, otherwise fallback to stateEditRecipe
    const effectiveEditRecipe = freshRecipe || stateEditRecipe;

    // State initialization using effective recipe
    const [name, setName] = useState(effectiveEditRecipe?.name || defaultName || '');
    const [description, setDescription] = useState(effectiveEditRecipe?.description || ''); // Added description state
    const [servings, setServings] = useState(effectiveEditRecipe?.servings_per_recipe || 1);
    const [ingredients, setIngredients] = useState<(Partial<RecipeIngredient> & { food: FoodItem, quantity: number, unit: string, servings: number, sourceEntryId?: string })[]>([]);

    // Metadata State
    const [category, setCategory] = useState<string>('Meal'); // Default to Meal
    const [drinkType, setDrinkType] = useState<string>('');
    const [source, setSource] = useState('Home-cooked');
    const [processingLevel, setProcessingLevel] = useState('Minimally processed');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSearchCategory, setSelectedSearchCategory] = useState<string>('All');
    const [selectedIngredientType, setSelectedIngredientType] = useState<string | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Initial Load
    useEffect(() => {
        if (effectiveEditRecipe) {
            // Map existing ingredients
            if (effectiveEditRecipe.ingredients) {
                const mapped = effectiveEditRecipe.ingredients.map(ing => ({
                    ...ing,
                    // Ensure food object is populated properly by useRecipes mapping
                    // We need to re-derive is_custom because useRecipes might not set it on the joined object
                    food: {
                        ...(ing.food as FoodItem),
                        is_custom: !!ing.custom_food_id // If custom_food_id exists on the ingredient relation, it is custom
                    },
                    servings: (ing.quantity || 0) / ((ing.food as FoodItem)?.serving_size_g || 100)
                }));
                setIngredients(mapped);
            }
            // Load metadata
            if (effectiveEditRecipe.category) setCategory(effectiveEditRecipe.category);
            if (effectiveEditRecipe.drink_type) setDrinkType(effectiveEditRecipe.drink_type);
            if (effectiveEditRecipe.tags) setTags(effectiveEditRecipe.tags);
        } else if (fromMeal) {
            // "Save as My Meal" Mode
            // setName(defaultName || ''); // Already set in useState
            const mapped = fromMeal.map(entry => {
                let qty = entry.quantity_g; // in grams
                // If the entry has a recipe, we might want to use its serving size or default to 100g
                // For simplicity, we'll assume quantity is in grams for now.
                // Correctly determine which object to use and tag it
                let foodItem: FoodItem | null = null;

                // CRITICAL FIX: Check IDs first to identify source, largely ignores the normalized 'entry.food' object from useNutrition
                if (entry.food_id && entry.food) {
                    foodItem = { ...entry.food, is_custom: false };
                } else if (entry.custom_food_id) {
                    // Use custom_food if available, fallback to entry.food (which useNutrition populates with custom food data)
                    const source = entry.custom_food || entry.food;
                    if (source) {
                        foodItem = { ...source, is_custom: true };
                    }
                } else if (entry.recipe) {
                    // Map recipe to FoodItem
                    foodItem = {
                        id: entry.recipe.id,
                        name: entry.recipe.name,
                        calories_per_100g: 0,
                        protein_per_100g: 0,
                        carbs_per_100g: 0,
                        fat_per_100g: 0,
                        serving_size_g: 100,
                        is_custom: true,
                        is_recipe: true
                    } as FoodItem;
                }

                if (!foodItem) return null;

                const baseServing = foodItem.serving_size_g || 100;
                const calculatedServings = qty / baseServing;

                return {
                    food: foodItem,
                    quantity: qty,
                    unit: 'g',
                    servings: calculatedServings,
                    sourceEntryId: entry.id
                };
            }).filter(Boolean) as any[];
            setIngredients(mapped);            // Try to infer category?
            // Try to infer category?
        }
    }, [effectiveEditRecipe, fromMeal, defaultName]); // Depend on effectiveEditRecipe instead of just editRecipe

    // Search Effect
    useEffect(() => {
        const fetchFoods = async () => {
            // If searching or browsing a category, fetch
            if (searchQuery.length >= 2 || selectedSearchCategory !== 'All') {
                try {
                    const results = await searchFoods(searchQuery, selectedSearchCategory, selectedSubCategory || undefined, selectedIngredientType || undefined);
                    setSearchResults(results);
                } catch (err) {
                    console.error("Failed to search foods", err);
                    setSearchResults([]);
                }
            } else {
                setSearchResults([]);
            }
        };

        // Debounce
        const t = setTimeout(fetchFoods, 300);
        return () => clearTimeout(t);
    }, [searchQuery, selectedSearchCategory, selectedSubCategory, selectedIngredientType]); // Add dependencies

    // CATEGORIES Definition (Mirrors AddFood.tsx)
    const CATEGORIES: Record<string, string[] | Record<string, string[]>> = {
        'Ingredients': {
            'Carbs': ['Bread', 'Pasta', 'Tortillas', 'Grains'],
            'Fats': ['Butter', 'Oil'],
            'Dairy': ['Milk', 'Cheese', 'Yogurt'],
            'Protein': ['White Meat', 'Red Meat', 'Egg', 'Plant Protein'],
            'Condiments': [],
            'Spices': [],
            'Misc': []
        },
        'Fruit': ['Fresh', 'Dried', 'Frozen', 'Canned'],
        'Vegetable': ['Fresh', 'Frozen', 'Canned', 'Dried'],
    };

    // Handlers
    const handleAddIngredient = (food: FoodItem) => {
        setIngredients(prev => [...prev, {
            food,
            quantity: food.serving_size_g || 100,
            unit: 'g',
            servings: 1
        }]);
        // Don't clear search query/results, let user keep browsing if they want
        // setSearchQuery('');
        // setSearchResults([]); 
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredients(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateQuantity = (index: number, val: number) => {
        // If updating grams directly, recalc servings
        setIngredients(prev => prev.map((item, i) => {
            if (i !== index) return item;
            const baseServing = item.food.serving_size_g || 100;
            return { ...item, quantity: val, servings: val / baseServing };
        }));
    };

    const handleUpdateServings = (index: number, val: number) => {
        setIngredients(prev => prev.map((item, i) => {
            if (i !== index) return item;
            const baseServing = item.food.serving_size_g || 100;
            return {
                ...item,
                servings: val,
                quantity: val * baseServing
            };
        }));
    };

    const handleUpdateUnit = (index: number, val: string) => {
        setIngredients(prev => prev.map((item, i) => i === index ? { ...item, unit: val } : item));
    };

    // Calculate Totals
    const totals = ingredients.reduce((acc, item) => {
        if (!item.food) return acc;
        const ratio = item.quantity / 100;
        return {
            calories: acc.calories + (item.food.calories_per_100g * ratio),
            protein: acc.protein + (item.food.protein_per_100g * ratio),
            carbs: acc.carbs + (item.food.carbs_per_100g * ratio),
            fat: acc.fat + (item.food.fat_per_100g * ratio),
        };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const handleSave = async () => {
        if (!name.trim()) return alert("Please name your meal");
        // Validation: Require at least one ingredient? Or allow empty?
        if (ingredients.length === 0) {
            if (!confirm("This meal has no ingredients. Save empty meal?")) return;
        }

        setIsSaving(true);
        try {
            // Map ingredients for payload
            const ingredientPayload = ingredients.map(ing => ({
                food_id: !ing.food?.is_custom ? ing.food?.id : undefined,
                custom_food_id: ing.food?.is_custom ? ing.food?.id : undefined,
                quantity: ing.quantity,
                unit: ing.unit
            }));

            const payload = {
                name,
                servings_per_recipe: Number(servings),
                serving_unit: 'serving',
                ingredients: ingredientPayload,
                category: category || undefined,
                drink_type: category === 'Drink' ? drinkType : undefined,
                source: source || undefined,
                processing_level: processingLevel || undefined,
                tags: tags.length > 0 ? tags : undefined,
            };

            console.log("Saving Recipe Payload:", {
                payload,
                ingredients: ingredientPayload,
                rawIngredients: ingredients
            });

            let createdRecipe: Recipe | null = null;

            if (isEditing && effectiveEditRecipe) {
                await updateRecipe({
                    id: effectiveEditRecipe.id,
                    updates: {
                        name,
                        servings_per_recipe: Number(servings),
                        category: category || undefined,
                        drink_type: category === 'Drink' ? drinkType : undefined,
                        source: source || undefined,
                        processing_level: processingLevel || undefined,
                        tags: tags.length > 0 ? tags : undefined,
                    },
                    ingredients: ingredientPayload
                });
            } else {
                const res = await createRecipe(payload);
                if (res) createdRecipe = res;
            }

            // Post-Save Entry Replacement
            if (!isEditing && fromMeal && fromMeal.length > 0 && createdRecipe) {
                const mealId = fromMeal[0].meal_id;
                const newEntryPayload = {
                    mealId: mealId,
                    recipeId: createdRecipe.id,
                    nutrition: {
                        calories: totals.calories / Number(servings),
                        protein: totals.protein / Number(servings),
                        carbs: totals.carbs / Number(servings),
                        fat: totals.fat / Number(servings)
                    },
                    quantity: 100, // Placeholder grams (UI typically ignores this for recipes if serving based, but schema requires it)
                    metric_quantity: 1,
                    metric_unit: 'serving',
                    logged_at: new Date().toISOString()
                };

                console.log("Replacing Entries with Recipe:", newEntryPayload);

                // 1. Add New Entry
                await addEntry(newEntryPayload);

                // 2. Delete Old Entries (ONLY those included in the recipe)
                // Filter fromMeal to find entries that were actually used (present in final ingredients list)
                const usedEntryIds = new Set(ingredients.map(ing => ing.sourceEntryId).filter(Boolean));
                const entriesToDelete = fromMeal.filter(e => usedEntryIds.has(e.id));

                console.log("Deleting replaced entries:", entriesToDelete.map(e => e.id));
                console.log("Keeping entries:", fromMeal.filter(e => !usedEntryIds.has(e.id)).map(e => e.id));

                await Promise.all(entriesToDelete.map(e => deleteEntry(e.id)));
            }

            navigate(-1);
        } catch (error) {
            console.error("Failed to save recipe", error);
            alert("Failed to save meal. Please check your connection and try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // Delete Handler
    const handleDelete = async () => {
        if (!isEditing || !effectiveEditRecipe?.id) return;
        if (!confirm("Are you sure you want to delete this meal? This cannot be undone.")) return;

        try {
            setIsSaving(true);
            await deleteRecipe(effectiveEditRecipe.id);
            navigate(-1);
        } catch (error) {
            console.error("Failed to delete recipe:", error);
            alert("Failed to delete meal. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const myMealCategories = ['Meal', 'Snack', 'Drink', 'Condiment', 'Fast Food'];
    const dbCategories = ['All', 'Meal', 'Snack', 'Drink', 'Fruit', 'Vegetable', 'Fast Food', 'Ingredients', 'Other'];

    const toggleTag = (tag: string) => {
        setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    return (
        <div className="min-h-screen bg-[#141414] flex flex-col text-white ios-pwa-layout-fix safe-area-inset-bottom flex flex-col-reverse md:flex-row h-screen overflow-hidden">

            {/* LEFT SIDEBAR: Search & Browse (Hidden on mobile if not searching? Or stacked? User said "Left side... or side panel". I'll make it col on mobile, side on desktop) */}
            <div className="w-full md:w-1/3 bg-[#141414] border-r border-[#2A2A2A] flex flex-col h-1/2 md:h-full z-10">
                <div className="p-4 border-b border-[#2A2A2A]">
                    <h2 className="text-white font-bold mb-3">Add Ingredients</h2>
                    <input
                        type="text"
                        placeholder="Search foods..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3 text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#3B82F6]"
                    />
                    {/* Category Filter Chips */}
                    <div className="flex gap-2 mt-3 overflow-x-auto custom-scrollbar pb-2">
                        {dbCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => {
                                    if (selectedSearchCategory === cat) return;
                                    setSelectedSearchCategory(cat);
                                    setSelectedIngredientType(null);
                                    setSelectedSubCategory(null);
                                }}
                                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedSearchCategory === cat
                                    ? 'bg-[#3B82F6] text-white'
                                    : 'bg-[#0A0A0A] text-[#8E8E93] border border-[#2A2A2A] hover:border-[#666]'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Sub-Category Chips (Sidebar) */}
                    <div className="mt-2 space-y-2">
                        {(() => {
                            if (!selectedSearchCategory || selectedSearchCategory === 'All') return null;
                            const catData = CATEGORIES[selectedSearchCategory];
                            if (!catData) return null;

                            // 1. Ingredients Types
                            if (selectedSearchCategory === 'Ingredients') {
                                return (
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap gap-1.5">
                                            {Object.keys(catData).map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => {
                                                        if (selectedIngredientType === type) {
                                                            setSelectedIngredientType(null);
                                                            setSelectedSubCategory(null);
                                                        } else {
                                                            setSelectedIngredientType(type);
                                                            setSelectedSubCategory(null);
                                                        }
                                                    }}
                                                    className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${selectedIngredientType === type
                                                        ? 'bg-[#3B82F6] border-[#3B82F6] text-white'
                                                        : 'bg-[#1A1A1A] border-[#333] text-[#A1A1A1] hover:text-white'
                                                        }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Ingredient Subtypes */}
                                        {selectedIngredientType && (catData as any)[selectedIngredientType]?.length > 0 && (
                                            <div className="pt-2 border-t border-[#2A2A2A] animate-in fade-in slide-in-from-top-1">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <button
                                                        onClick={() => setSelectedSubCategory(null)}
                                                        className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${!selectedSubCategory
                                                            ? 'bg-[#3B82F6] border-[#3B82F6] text-white'
                                                            : 'bg-[#1A1A1A] border-[#333] text-[#A1A1A1] hover:text-white'
                                                            }`}
                                                    >
                                                        All {selectedIngredientType}
                                                    </button>
                                                    {(catData as any)[selectedIngredientType].map((sub: string) => (
                                                        <button
                                                            key={sub}
                                                            onClick={() => setSelectedSubCategory(sub)}
                                                            className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${selectedSubCategory === sub
                                                                ? 'bg-[#3B82F6] border-[#3B82F6] text-white'
                                                                : 'bg-[#1A1A1A] border-[#333] text-[#A1A1A1] hover:text-white'
                                                                }`}
                                                        >
                                                            {sub}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // 2. Simple Arrays (Fruit/Veg)
                            if (Array.isArray(catData)) {
                                return (
                                    <div className="flex flex-wrap gap-1.5">
                                        <button
                                            onClick={() => setSelectedSubCategory(null)}
                                            className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${!selectedSubCategory
                                                ? 'bg-[#3B82F6] border-[#3B82F6] text-white'
                                                : 'bg-[#1A1A1A] border-[#333] text-[#A1A1A1] hover:text-white'
                                                }`}
                                        >
                                            All
                                        </button>
                                        {catData.map(sub => (
                                            <button
                                                key={sub}
                                                onClick={() => setSelectedSubCategory(sub)}
                                                className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${selectedSubCategory === sub
                                                    ? 'bg-[#3B82F6] border-[#3B82F6] text-white'
                                                    : 'bg-[#1A1A1A] border-[#333] text-[#A1A1A1] hover:text-white'
                                                    }`}
                                            >
                                                {sub}
                                            </button>
                                        ))}
                                    </div>
                                );
                            }
                        })()}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {searchQuery.length < 2 && selectedSearchCategory === 'All' && searchResults.length === 0 ? (
                        <div className="text-center py-8 text-[#444]">
                            <p className="text-sm">Type to search or select a category</p>
                        </div>
                    ) : (
                        searchResults.map(food => (
                            <button
                                key={food.id}
                                onClick={() => handleAddIngredient(food)}
                                className="w-full text-left p-3 hover:bg-[#1A1D21] rounded-lg transition-colors flex justify-between group"
                            >
                                <div>
                                    <div className="text-white font-medium">{food.name}</div>
                                    <div className="text-xs text-[#6B6B6B]">{food.brand} • {Math.round(food.calories_per_100g)} kcal/100g</div>
                                </div>
                                <div className="text-[#3B82F6] opacity-0 group-hover:opacity-100">+</div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT SIDE: Editor */}
            <div className="flex-1 flex flex-col h-1/2 md:h-full bg-[#0F0F0F] relative">
                {/* Header */}
                <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between bg-[#0F0F0F] z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h1 className="text-xl font-bold">{isEditing ? 'Edit Meal' : 'New My Meal'}</h1>
                    </div>
                    <div className="flex gap-2">
                        {isEditing && (
                            <button
                                onClick={handleDelete}
                                className="bg-[#2A2A2A] hover:bg-red-900/50 text-red-500 px-4 py-2 rounded-full font-bold text-sm transition-all"
                            >
                                Delete
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg shadow-blue-900/20 disabled:opacity-50 transition-all"
                        >
                            {isSaving ? 'Saving...' : 'Save Meal'}
                        </button>
                    </div>
                </div>

                {/* Main Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">

                    {/* 1. Basic Info */}
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Meal Name (e.g. Morning Oats)"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-transparent text-3xl font-bold text-white placeholder-[#333] border-none focus:outline-none px-0"
                        />
                        <div className="flex items-center gap-4">
                            <label className="text-white text-sm">Servings:</label>
                            <input
                                type="number"
                                min="1"
                                value={servings}
                                onChange={e => setServings(Number(e.target.value))}
                                className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-2 text-white w-20 text-center"
                            />
                        </div>
                    </div>

                    {/* 2. Classification */}
                    <div className="space-y-6 bg-[#141414] p-5 rounded-2xl border border-[#2A2A2A]">
                        {/* Category */}
                        <div className="space-y-3">
                            <label className="text-xs text-[#6B6B6B] uppercase font-bold px-1">Category</label>
                            <div className="flex flex-wrap gap-2">
                                {myMealCategories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setCategory(cat)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${category === cat
                                            ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                                            : 'bg-[#0A0A0A] text-[#8E8E93] border-transparent hover:border-[#333]'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Drink Types (Conditional) */}
                        {category === 'Drink' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <DrinkTypeSelector value={drinkType} onChange={setDrinkType} />
                            </div>
                        )}

                        {/* Meal Tags (Breakfast/Lunch/Dinner) */}
                        <div className="space-y-3">
                            <label className="text-xs text-[#6B6B6B] uppercase font-bold px-1">Meal Tags (Optional)</label>
                            <div className="flex flex-wrap gap-2">
                                {['Breakfast', 'Lunch', 'Dinner'].map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => toggleTag(tag)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${tags.includes(tag)
                                            ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/50'
                                            : 'bg-[#1A1A1A] text-[#666] border-transparent hover:border-[#333]'
                                            }`}
                                    >
                                        {tags.includes(tag) ? '✓ ' : '+ '}{tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>


                    {/* 3. Ingredients & Totals */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* Totals */}
                        <div className="grid grid-cols-4 gap-2 bg-[#141414] p-4 rounded-xl border border-[#2A2A2A]">
                            <div className="text-center">
                                <div className="text-[10px] text-[#666] uppercase mb-1">Calories</div>
                                <div className="text-xl text-white font-bold">{Math.round(totals.calories / servings)}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] text-[#666] uppercase mb-1">Protein</div>
                                <div className="text-xl text-[#3B82F6] font-bold">{Math.round(totals.protein / servings)}g</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] text-[#666] uppercase mb-1">Carbs</div>
                                <div className="text-xl text-[#10B981] font-bold">{Math.round(totals.carbs / servings)}g</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] text-[#666] uppercase mb-1">Fat</div>
                                <div className="text-xl text-[#F59E0B] font-bold">{Math.round(totals.fat / servings)}g</div>
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-3">
                            <h3 className="text-[#6B6B6B] uppercase text-xs font-semibold tracking-wider">Ingredients ({ingredients.length})</h3>
                            {ingredients.map((ing, i) => (
                                <div key={i} className="flex items-center justify-between bg-[#141414] p-4 rounded-xl border border-[#2A2A2A] group">
                                    <div className="flex-1">
                                        <div className="text-white font-medium">{ing.food?.name || 'Unknown Food'}</div>
                                        <div className="text-xs text-[#6B6B6B]">
                                            {ing.food?.serving_unit ? `1 ${ing.food.serving_unit} = ` : ''}{Math.round(ing.food?.serving_size_g || 100)}g • {Math.round(ing.quantity || 0)}g total
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] px-2 py-1">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={ing.servings || 0}
                                                onChange={e => handleUpdateServings(i, Number(e.target.value))}
                                                className="bg-transparent text-white w-12 text-right text-sm focus:outline-none border-r border-[#2A2A2A] pr-2 mr-2"
                                            />
                                            <span className="text-[#666] text-xs">servings ({ing.unit})</span>
                                        </div>
                                        <button onClick={() => handleRemoveIngredient(i)} className="text-[#666] hover:text-red-500 transition-colors">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {ingredients.length === 0 && (
                                <div className="text-center py-12 text-[#444] border-2 border-dashed border-[#222] rounded-2xl">
                                    <div className="text-2xl mb-2">🥗</div>
                                    <div>No ingredients yet</div>
                                    <div className="text-sm">Search and add foods from the sidebar</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

