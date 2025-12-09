import React, { useState } from 'react';
import { useFood } from '../../hooks/useFood';
import { useRecipes } from '../../hooks/useRecipes';
import { FoodItem } from '../../types';

interface RecipeBuilderProps {
    onClose: () => void;
    onSave?: () => void;
    initialRecipe?: any; // For editing
}

export function RecipeBuilder({ onClose, onSave, initialRecipe }: RecipeBuilderProps) {
    // Recipe State
    const [name, setName] = useState(initialRecipe?.name || '');
    const [servings, setServings] = useState(initialRecipe?.servings_per_recipe || 1);
    const [ingredients, setIngredients] = useState<Array<{
        food: FoodItem;
        quantity: number;
        unit: string;
    }>>([]);

    // Metadata State
    const [category, setCategory] = useState(initialRecipe?.category || '');
    const [source, setSource] = useState(initialRecipe?.source || 'Home-cooked');
    const [processingLevel, setProcessingLevel] = useState(initialRecipe?.processing_level || 'Minimally processed');
    const [tags, setTags] = useState<string[]>(initialRecipe?.tags || []);
    const [tagInput, setTagInput] = useState('');

    // Logic to load ingredients from initialRecipe if needed... omitted for MVP unless needed.

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const { searchFoods } = useFood();
    const [searchResults, setSearchResults] = useState<FoodItem[]>([]);

    const { createRecipe, updateRecipe } = useRecipes();
    const [isSaving, setIsSaving] = useState(false);

    React.useEffect(() => {
        if (initialRecipe) {
            setName(initialRecipe.name);
            setServings(initialRecipe.servings_per_recipe);
            setCategory(initialRecipe.category || '');
            setSource(initialRecipe.source || 'Home-cooked');
            setProcessingLevel(initialRecipe.processing_level || 'Minimally processed');
            setTags(initialRecipe.tags || []);
            if (initialRecipe.ingredients) {
                setIngredients(initialRecipe.ingredients.map((ing: any) => ({
                    food: ing.food || ing.custom_food, // Ensure food object is populated (useRecipes should handle this mapping)
                    quantity: ing.quantity,
                    unit: ing.unit
                })));
            }
        }
    }, [initialRecipe]);

    // Search Effect
    React.useEffect(() => {
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

    // Add Ingredient
    const handleAddIngredient = (food: FoodItem) => {
        setIngredients(prev => [...prev, {
            food,
            quantity: food.serving_size_g || 100,
            unit: 'g'
        }]);
        setSearchQuery('');
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredients(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateQuantity = (index: number, val: number) => {
        setIngredients(prev => prev.map((item, i) => i === index ? { ...item, quantity: val } : item));
    };

    // Calculate Live Totals (shared logic?)
    const totals = ingredients.reduce((acc, item) => {
        // Fallback for undefined food (shouldn't happen but safe guard)
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
                // Metadata
                category: category || undefined,
                source: source || undefined,
                processing_level: processingLevel || undefined,
                tags: tags.length > 0 ? tags : undefined,
            };

            if (initialRecipe) {
                await updateRecipe({
                    id: initialRecipe.id,
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
                // Create
                await createRecipe(payload);
            }

            onClose();
            if (onSave) onSave(payload);
        } catch (e) {
            console.error(e);
            alert("Failed to save recipe");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col safe-area-inset-top">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                <button onClick={onClose} className="text-[#6B6B6B]">Cancel</button>
                <h2 className="text-white font-semibold">Create Meal</h2>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="text-[#3B82F6] font-medium disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
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

                {/* Metadata Section */}
                <div className="space-y-4 pt-4 border-t border-[#2A2A2A]">
                    <h3 className="text-[#6B6B6B] uppercase text-xs font-semibold tracking-wider">Organization</h3>

                    {/* Category */}
                    <div>
                        <label className="text-xs text-[#6B6B6B] mb-2 block">Category</label>
                        <div className="flex flex-wrap gap-2">
                            {['Meal', 'Snack', 'Drink', 'Fruit', 'Vegetable', 'Fast Food', 'Dessert', 'Other'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    className={`px - 3 py - 1.5 rounded - full text - xs font - medium transition - colors ${
    category === cat
        ? 'bg-[#3B82F6] text-white'
        : 'bg-[#2A2A2A] text-[#A1A1A1] hover:text-white'
} `}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Source */}
                    <div>
                        <label className="text-xs text-[#6B6B6B] mb-2 block">Source</label>
                        <div className="flex flex-wrap gap-2">
                            {['Home-cooked', 'Packaged snack', 'Restaurant', 'Fast food chain', 'Coffee shop', 'Other'].map(src => (
                                <button
                                    key={src}
                                    onClick={() => setSource(src)}
                                    className={`px - 3 py - 1.5 rounded - full text - xs font - medium transition - colors ${
    source === src
        ? 'bg-[#10B981] text-white'
        : 'bg-[#2A2A2A] text-[#A1A1A1] hover:text-white'
} `}
                                >
                                    {src}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Processing Level */}
                    <div>
                        <label className="text-xs text-[#6B6B6B] mb-2 block">Processing</label>
                        <div className="flex flex-wrap gap-2">
                            {['Whole food', 'Minimally processed', 'Ultra processed'].map(lvl => (
                                <button
                                    key={lvl}
                                    onClick={() => setProcessingLevel(lvl)}
                                    className={`px - 3 py - 1.5 rounded - full text - xs font - medium transition - colors ${
    processingLevel === lvl
        ? 'bg-[#F59E0B] text-white'
        : 'bg-[#2A2A2A] text-[#A1A1A1] hover:text-white'
} `}
                                >
                                    {lvl}
                                </button>
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
                                    <button
                                        onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                                        className="hover:text-white"
                                    >
                                        ×
                                    </button>
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
                                <div className="text-white font-medium">{ing.food.name}</div>
                                <div className="text-xs text-[#6B6B6B]">{ing.food.brand}</div>
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

                {/* Add Ingredient Search */}
                <div className="space-y-3 pt-4 border-t border-[#2A2A2A]">
                    <h3 className="text-white font-medium">Add Ingredient</h3>
                    <input
                        type="text"
                        placeholder="Search foods..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-3 text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#3B82F6]"
                    />

                    {/* Add Search Results */}
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
            </div>
        </div>
    );
}
