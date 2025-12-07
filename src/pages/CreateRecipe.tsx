
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFood } from '../hooks/useFood';
import { useRecipes } from '../hooks/useRecipes';
import { FoodItem } from '../types';

export function CreateRecipe() {
    const navigate = useNavigate();
    const location = useLocation();
    const { searchFoods } = useFood();
    const { createRecipe, updateRecipe } = useRecipes();

    const editRecipe = location.state?.editRecipe;
    const isEditing = !!editRecipe;

    // Recipe State
    const [name, setName] = useState('');
    const [servings, setServings] = useState(1);
    const [ingredients, setIngredients] = useState<Array<{
        food: FoodItem;
        quantity: number;
        unit: string;
    }>>([]);

    // Metadata State
    const [category, setCategory] = useState('');
    const [source, setSource] = useState('Home-cooked');
    const [processingLevel, setProcessingLevel] = useState('Minimally processed');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Initial Load
    useEffect(() => {
        if (editRecipe) {
            setName(editRecipe.name || '');
            setServings(editRecipe.servings_per_recipe || 1);
            setCategory(editRecipe.category || '');
            setSource(editRecipe.source || 'Home-cooked');
            setProcessingLevel(editRecipe.processing_level || 'Minimally processed');
            setTags(editRecipe.tags || []);

            if (editRecipe.recipe_ingredients) {
                setIngredients(editRecipe.recipe_ingredients.map((ing: any) => ({
                    food: ing.food || ing.custom_food, // Normalize joined data
                    quantity: ing.quantity,
                    unit: ing.unit
                })));
            } else if (editRecipe.ingredients) {
                // Fallback if data structure differs (e.g. passed from different source)
                setIngredients(editRecipe.ingredients.map((ing: any) => ({
                    food: ing.food || ing.custom_food,
                    quantity: ing.quantity,
                    unit: ing.unit
                })));
            }
        }
    }, [editRecipe]);

    // Search Effect
    useEffect(() => {
        const t = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                const results = await searchFoods(searchQuery);
                setSearchResults(results);
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // Handlers
    const handleAddIngredient = (food: FoodItem) => {
        setIngredients(prev => [...prev, {
            food,
            quantity: food.serving_size_g || 100,
            unit: 'g'
        }]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredients(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateQuantity = (index: number, val: number) => {
        setIngredients(prev => prev.map((item, i) => i === index ? { ...item, quantity: val } : item));
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
        if (!name) return alert("Please name your meal");
        if (ingredients.length === 0) return alert("Add at least one food");

        setIsSaving(true);
        try {
            const ingredientPayload = ingredients.map(i => ({
                food_id: (i.food as any).is_custom ? undefined : i.food.id,
                custom_food_id: (i.food as any).is_custom ? i.food.id : undefined,
                quantity: i.quantity,
                unit: i.unit
            }));

            const payload = {
                name,
                servings_per_recipe: Number(servings),
                serving_unit: 'serving',
                ingredients: ingredientPayload,
                category: category || undefined,
                source: source || undefined,
                processing_level: processingLevel || undefined,
                tags: tags.length > 0 ? tags : undefined,
            };

            if (isEditing && editRecipe) {
                await updateRecipe({
                    id: editRecipe.id,
                    updates: {
                        name,
                        servings_per_recipe: Number(servings),
                        category: category || undefined,
                        source: source || undefined,
                        processing_level: processingLevel || undefined,
                        tags: tags.length > 0 ? tags : undefined,
                    },
                    ingredients: ingredientPayload
                });
            } else {
                await createRecipe(payload);
            }

            navigate(-1);
        } catch (e) {
            console.error(e);
            alert("Failed to save meal");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F0F0F] text-white p-4 safe-area-inset-bottom">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-bold">{isEditing ? 'Edit Meal' : 'Create Meal'}</h1>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="text-[#3B82F6] font-semibold disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>

            <div className="space-y-6 max-w-lg mx-auto pb-20">
                {/* Name & Settings */}
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Meal Name (e.g. Yogurt Bowl)"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 text-white text-lg placeholder-[#6B6B6B] focus:outline-none focus:border-[#3B82F6]"
                    />
                    <div className="flex items-center gap-4">
                        <label className="text-white text-sm whitespace-nowrap">Servings:</label>
                        <input
                            type="number"
                            min="1"
                            value={servings}
                            onChange={e => setServings(Number(e.target.value))}
                            className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-2 text-white w-20 text-center"
                        />
                    </div>
                </div>

                {/* Totals Preview */}
                <div className="grid grid-cols-4 gap-2 bg-[#141414] p-4 rounded-xl border border-[#2A2A2A]">
                    <div className="text-center">
                        <div className="text-xs text-[#6B6B6B]">Calories</div>
                        <div className="text-white font-bold">{Math.round(totals.calories / servings)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-[#6B6B6B]">Protein</div>
                        <div className="text-white font-bold text-blue-400">{Math.round(totals.protein / servings)}g</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-[#6B6B6B]">Carbs</div>
                        <div className="text-white font-bold text-green-400">{Math.round(totals.carbs / servings)}g</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-[#6B6B6B]">Fat</div>
                        <div className="text-white font-bold text-yellow-400">{Math.round(totals.fat / servings)}g</div>
                    </div>
                    <div className="col-span-4 text-center mt-2 text-[10px] text-[#444] uppercase tracking-wide">
                        Per Serving
                    </div>
                </div>

                {/* Ingredients List */}
                <div className="space-y-3">
                    <h3 className="text-[#6B6B6B] uppercase text-xs font-semibold tracking-wider">Ingredients</h3>

                    {ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center justify-between bg-[#141414] p-3 rounded-xl border border-[#2A2A2A]">
                            <div className="flex-1">
                                <div className="text-white font-medium">{ing.food?.name || 'Unknown Food'}</div>
                                <div className="text-xs text-[#6B6B6B]">{ing.food?.brand}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={ing.quantity}
                                    onChange={e => handleUpdateQuantity(i, Number(e.target.value))}
                                    className="bg-black border border-[#2A2A2A] rounded p-1 text-white w-16 text-right text-sm"
                                />
                                <span className="text-[#6B6B6B] text-sm">{ing.unit}</span>
                                <button onClick={() => handleRemoveIngredient(i)} className="text-red-500 p-1">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}

                    {ingredients.length === 0 && (
                        <div className="text-center py-8 text-[#444] border-2 border-dashed border-[#2A2A2A] rounded-xl">
                            Add ingredients to build your meal
                        </div>
                    )}
                </div>

                {/* Add Ingredient / Search */}
                <div className="space-y-3 pt-4 border-t border-[#2A2A2A]">
                    <h3 className="text-white font-medium">Add Ingredient</h3>
                    <input
                        type="text"
                        placeholder="Search foods..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-3 text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#3B82F6]"
                    />

                    {/* Search Results */}
                    <div className="space-y-1">
                        {searchResults.map(food => (
                            <button
                                key={food.id}
                                onClick={() => handleAddIngredient(food)}
                                className="w-full text-left p-3 hover:bg-[#141414] rounded-lg transition-colors flex justify-between group"
                            >
                                <div>
                                    <div className="text-white">{food.name}</div>
                                    <div className="text-xs text-[#6B6B6B]">{food.brand} • {Math.round(food.calories_per_100g)} kcal/100g</div>
                                </div>
                                <div className="text-[#3B82F6] opacity-0 group-hover:opacity-100">+ Add</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Metadata */}
                <div className="space-y-4 pt-4 border-t border-[#2A2A2A]">
                    <h3 className="text-[#6B6B6B] uppercase text-xs font-semibold tracking-wider">Organization</h3>

                    {/* Category */}
                    <div>
                        <label className="text-xs text-[#6B6B6B] mb-2 block">Category</label>
                        <div className="flex flex-wrap gap-2">
                            {['Meal', 'Snack', 'Drink', 'Fruit', 'Vegetable', 'Fast Food', 'Dessert', 'Other'].map(cat => (
                                <button key={cat} onClick={() => setCategory(cat)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${category === cat ? 'bg-[#3B82F6] text-white' : 'bg-[#2A2A2A] text-[#A1A1A1] hover:text-white'}`}>{cat}</button>
                            ))}
                        </div>
                    </div>

                    {/* Source */}
                    <div>
                        <label className="text-xs text-[#6B6B6B] mb-2 block">Source</label>
                        <div className="flex flex-wrap gap-2">
                            {['Home-cooked', 'Packaged snack', 'Restaurant', 'Fast food chain', 'Coffee shop', 'Other'].map(src => (
                                <button key={src} onClick={() => setSource(src)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${source === src ? 'bg-[#10B981] text-white' : 'bg-[#2A2A2A] text-[#A1A1A1] hover:text-white'}`}>{src}</button>
                            ))}
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="text-xs text-[#6B6B6B] mb-2 block">Tags</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {tags.map(tag => (
                                <span key={tag} className="px-2 py-1 rounded bg-[#3B82F6]/20 text-[#3B82F6] text-xs flex items-center gap-1">
                                    {tag}
                                    <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}>×</button>
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder="Add tag (enter)"
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (tagInput.trim()) {
                                        setTags(prev => [...prev, tagInput.trim()]);
                                        setTagInput('');
                                    }
                                }
                            }}
                            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-3 text-white focus:outline-none focus:border-[#3B82F6]"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
