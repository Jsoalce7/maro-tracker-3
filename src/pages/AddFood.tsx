import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FoodItem, MealType } from '../types';
import { useFood } from '../hooks/useFood';
import { useRecipes } from '../hooks/useRecipes';
import { formatCalories, formatQuantity } from '../lib/format';
import { useNutrition } from '../hooks/useNutrition';
import { getTodayLocal } from '../utils/date';
import { useAppStore } from '../stores/appStore';

// Categories should be in this specific order
const CATEGORY_ORDER = [
    'Favorites', // Special
    'My Meals', // Special
    'Meal',
    'Snack',
    'Drink',
    'Ingredients',
    'Fruit',
    'Vegetable',
    'Fast Food',
    'Other'
];

const mealLabels: Record<MealType, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snacks: 'Snacks',
};

const CATEGORIES: Record<string, string[]> = {
    'Meal': ['Breakfast', 'Lunch', 'Dinner'],
    'Snack': ['Chips', 'Cookies', 'Candy', 'Dessert', 'Protein Bar'],
    'Drink': ['Water', 'Soda', 'Coffee', 'Tea', 'Energy Drink', 'Electrolytes', 'Alcohol', 'Juice', 'Smoothie', 'Protein Shake'],
    'Ingredients': ['Protein', 'Dairy', 'Carbs', 'Fats', 'Condiments', 'Misc'],
    'Fruit': ['Fresh', 'Dried', 'Frozen'],
    'Vegetable': ['Fresh', 'Frozen', 'Canned'],
    'Fast Food': [],
    'Other': []
};

export function AddFood() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // URL Params
    const mealType = searchParams.get('mealType') as MealType | null;
    const mode = searchParams.get('mode') as 'add' | 'manage' || 'add';
    const initialFoodId = searchParams.get('initialFoodId');

    const dateParam = searchParams.get('date');
    const { selectedDate } = useAppStore();
    // Prefer URL date, then store date, then today
    const targetDate = dateParam || selectedDate || getTodayLocal();

    const { dayLog, addEntry } = useNutrition(targetDate);
    const { searchFoods, recentFoods, favorites, toggleFavorite } = useFood();
    const { recipes } = useRecipes();

    // Tab State
    const [activeTab, setActiveTab] = useState<'search' | 'recents'>('search');

    // Search Sub-View
    const [searchView, setSearchView] = useState<'categories' | 'brands' | 'results'>('categories');

    // ... (State unchanged)
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
    const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);

    // Selection State
    const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
    const [quantity, setQuantity] = useState('100');
    const [servingUnit, setServingUnit] = useState('g');

    // Multi-Select State
    const [isMultiSelect, setIsMultiSelect] = useState(false);
    const [selectedItems, setSelectedItems] = useState<{ food: FoodItem, quantity: number, unit: string }[]>([]);
    const [showReview, setShowReview] = useState(false);


    // Search Query
    const { data: searchResults } = useQuery({
        queryKey: ['foodSearch', searchQuery, selectedCategory, selectedSubCategory],
        queryFn: () => searchFoods(searchQuery, selectedCategory || 'All'),
        enabled: true,
        staleTime: 1000 * 60,
    });

    // Auto-switch to results view when typing
    useEffect(() => {
        if (searchQuery.length > 0) {
            setSearchView('results');
        } else if (searchQuery.length === 0 && !selectedCategory) {
            setSearchView('categories');
        }
    }, [searchQuery]);

    // Handle Food Selection
    const handleSelectFood = (food: FoodItem) => {
        if (isMultiSelect && mode !== 'manage') {
            if (selectedItems.some(i => i.food.id === food.id)) {
                setSelectedItems(prev => prev.filter(i => i.food.id !== food.id));
            } else {
                setSelectedItems(prev => [...prev, {
                    food,
                    quantity: 1,
                    unit: 'serving'
                }]);
            }
            return;
        }

        setSelectedFood(food);
        // Default to 'serving'
        setQuantity('1');
        setServingUnit('serving');
    };

    const handleBack = () => {
        if (selectedFood) {
            setSelectedFood(null);
            return;
        }
        if (selectedSubCategory) {
            setSelectedSubCategory(null);
            return;
        }
        if (selectedRestaurant) {
            setSelectedRestaurant(null);
            return;
        }
        if (searchQuery) {
            setSearchQuery('');
            return;
        }
        if (selectedCategory) {
            setSelectedCategory(null);
            setSearchView('categories');
            return;
        }
        navigate(-1); // Go back to main app
    };

    const handleAddSingle = () => {
        if (!selectedFood || !dayLog || !mealType) return;

        const qty = parseFloat(quantity) || 0;
        const isRecipe = (selectedFood as any).is_recipe;
        const isCustom = (selectedFood as any).is_custom;

        logFood(selectedFood, qty, servingUnit, isCustom, isRecipe);
        navigate(-1);
    };

    const handleAddMulti = () => {
        if (!dayLog || !mealType) return;

        selectedItems.forEach(item => {
            logFood(
                item.food,
                item.quantity,
                item.unit,
                (item.food as any).is_custom,
                (item.food as any).is_recipe
            );
        });
        navigate(-1);
    };

    const logFood = (
        food: FoodItem,
        quantity: number,
        unit: string,
        isCustom?: boolean,
        isRecipe?: boolean
    ) => {
        const meal = dayLog?.meals.find(m => m.meal_type === mealType);
        if (!meal) return;

        // Calculate Nutrition based on Unit
        let quantityInGrams = quantity;
        if (unit === 'serving') {
            quantityInGrams = quantity * (food.serving_size_g || 100);
        } else if (unit === 'oz') {
            quantityInGrams = quantity * 28.3495;
        } else if (unit === 'ml') {
            quantityInGrams = quantity;
        }

        const ratio = quantityInGrams / 100;
        const nutrition = {
            calories: (food.calories_per_100g || 0) * ratio,
            protein: (food.protein_per_100g || 0) * ratio,
            carbs: (food.carbs_per_100g || 0) * ratio,
            fat: (food.fat_per_100g || 0) * ratio,
        };
        const caffeine_mg = (food.caffeine_mg || 0) * ratio;

        // Determine Water Content (Only if explicitly Water)
        let water_ml = 0;
        if (food.category === 'Drink') {
            // Check if it's actually water
            const isWater =
                (food.tags && food.tags.includes('Water')) ||
                food.name.toLowerCase().includes('water') ||
                food.name.toLowerCase() === 'water';

            if (isWater) {
                // Convert quantity to ml
                if (unit === 'ml') water_ml = quantity;
                else if (unit === 'oz') water_ml = quantity * 29.5735;
                else water_ml = quantity; // gram approx ml
            }
        }

        addEntry({
            mealId: meal.id,
            foodId: (isCustom || isRecipe) ? undefined : food.id,
            customFoodId: (isCustom && !isRecipe) ? food.id : undefined,
            recipeId: (isRecipe) ? food.id : undefined,
            quantity: quantityInGrams,
            nutrition,
            caffeine_mg,
            water_ml: water_ml,
            metric_quantity: quantity,
            metric_unit: unit
        });
    };

    const handleToggleFavorite = () => {
        if (!selectedFood) return;
        toggleFavorite({
            foodId: selectedFood.id,
            isFavorite: favorites?.some(f => f.id === selectedFood.id) || false,
            isCustom: (selectedFood as any).is_custom,
            isRecipe: (selectedFood as any).is_recipe
        });
    };

    // --- RENDER LOGIC similar to Modal but adapting to page structure ---

    // Filter Logic for Display
    let displayFoods: FoodItem[] = [];
    if (activeTab === 'recents') {
        displayFoods = recentFoods || [];
    } else {
        if (searchView === 'results' || selectedCategory) {
            displayFoods = searchResults || [];

            // Handle "Other" category - show foods with no category or invalid category
            if (selectedCategory === 'Other') {
                const validCategories = ['Meal', 'Snack', 'Drink', 'Ingredients', 'Fruit', 'Vegetable', 'Fast Food'];
                displayFoods = displayFoods.filter(f =>
                    !f.category ||
                    !validCategories.includes(f.category) ||
                    (f.tags && f.tags.includes('Other'))
                );
            }

            // Apply subcategory filter with improved tag matching
            if (selectedSubCategory) {
                const subCatLower = selectedSubCategory.toLowerCase();
                displayFoods = displayFoods.filter(f => {
                    return (
                        // Check name
                        f.name.toLowerCase().includes(subCatLower) ||
                        // Check tags (exact match, case-insensitive)
                        (f.tags && f.tags.some(tag => tag.toLowerCase() === subCatLower)) ||
                        // Check tags (partial match)
                        (f.tags && f.tags.some(tag => tag.toLowerCase().includes(subCatLower))) ||
                        // Check ingredient_type for Ingredients category
                        (f.category === 'Ingredients' && f.ingredient_type === selectedSubCategory) ||
                        // Check category itself
                        (f.category && f.category.toLowerCase() === subCatLower) ||
                        // Check source
                        (f.source && f.source.toLowerCase() === subCatLower)
                    );
                });
            }

            // Apply restaurant filter for Fast Food
            if (selectedCategory === 'Fast Food' && selectedRestaurant) {
                displayFoods = displayFoods.filter(f => f.restaurant === selectedRestaurant);
            }

            // Debug logging
            if (selectedCategory) {
                console.log(`[Food Filter] Category: ${selectedCategory}, SubCategory: ${selectedSubCategory || 'none'}, Found: ${displayFoods.length} foods`);
                if (displayFoods.length === 0 && !searchQuery) {
                    console.warn('[Food Filter] No foods found! This category might be empty or filtering is too strict.');
                }
            }
        }
    }

    return (
        <div className="min-h-screen bg-[#141414] flex flex-col text-white">

            {/* SAFE AREA TOP for mobile */}
            <div className="safe-top bg-[#141414]"></div>

            {/* Header */}
            <div className="shrink-0 p-4 pb-3 border-b border-[#2A2A2A] bg-[#141414] z-10 space-y-4 sticky top-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Back Logic */}
                        <button onClick={handleBack} className="text-[#6B6B6B] hover:text-white p-1">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {(selectedCategory || selectedFood || searchQuery)
                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /> // Left Chevron
                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> // X
                                }
                            </svg>
                        </button>
                        <h2 className="text-white font-semibold text-lg">
                            {mealType ? `Add to ${mealLabels[mealType]}` : (mode === 'manage' ? 'Manage Foods' : 'Food Database')}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        {mode !== 'manage' && (
                            <button
                                onClick={() => {
                                    setIsMultiSelect(!isMultiSelect);
                                    setSelectedItems([]);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${isMultiSelect ? 'bg-[#3B82F6] text-white border-[#3B82F6]' : 'bg-[#1A1A1A] text-[#6B6B6B] border-[#2A2A2A]'}`}
                            >
                                Select Multiple
                            </button>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search foods, brands, meals..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl py-3 pl-10 pr-4 text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#3B82F6] text-base"
                    />
                </div>

                {/* Create Buttons */}
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => navigate('/create-food')} className="bg-[#2A2A2A] hover:bg-[#333] text-white py-3 sm:py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-colors min-h-[44px]">
                        <span>+</span> Create Food
                    </button>
                    <button onClick={() => navigate('/create-recipe')} className="bg-[#2A2A2A] hover:bg-[#333] text-white py-3 sm:py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-colors min-h-[44px]">
                        <span>+</span> Create Meal
                    </button>
                </div>

                {/* Tabs */}
                {activeTab === 'search' && !searchQuery && !selectedCategory && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSearchView('categories')}
                            className={`flex-1 py-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] sm:min-h-0 ${searchView === 'categories' ? 'bg-[#3B82F6] text-white' : 'bg-[#1A1A1A] text-[#6B6B6B] border border-[#2A2A2A]'}`}
                        >
                            Categories
                        </button>
                        <button
                            onClick={() => setSearchView('brands')}
                            className={`flex-1 py-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] sm:min-h-0 ${searchView === 'brands' ? 'bg-[#3B82F6] text-white' : 'bg-[#1A1A1A] text-[#6B6B6B] border border-[#2A2A2A]'}`}
                        >
                            Brands
                        </button>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-32">

                {/* Categories Grid */}
                {activeTab === 'search' && searchView === 'categories' && !selectedCategory && !searchQuery && (
                    <div className="space-y-2">
                        {CATEGORY_ORDER.map(cat => {
                            if (cat === 'Favorites') {
                                return (
                                    <button key="fav" onClick={() => { setSelectedCategory('Favorites'); setSearchView('results'); }} className="w-full flex justify-between items-center p-4 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#222] min-h-[56px]">
                                        <div className="flex items-center gap-3"><span className="text-red-500">♥</span><span className="font-medium">Favorites</span></div>
                                        <span className="text-[#6B6B6B] text-xs">{(favorites || []).length} items</span>
                                    </button>
                                );
                            }
                            if (cat === 'My Meals') {
                                return (
                                    <button key="meals" onClick={() => { setSelectedCategory('My Meals'); setSearchView('results'); }} className="w-full flex justify-between items-center p-4 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#222] min-h-[56px]">
                                        <div className="flex items-center gap-3"><span className="text-blue-500">🍽</span><span className="font-medium">My Meals</span></div>
                                        <span className="text-[#6B6B6B] text-xs">{(recipes || []).length} items</span>
                                    </button>
                                );
                            }
                            return (
                                <button key={cat} onClick={() => setSelectedCategory(cat)} className="w-full flex justify-between items-center p-4 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#222] min-h-[56px]">
                                    <span className="font-medium">{cat}</span>
                                    <span className="text-[#6B6B6B] transform rotate-90">›</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Brands Placeholder */}
                {activeTab === 'search' && searchView === 'brands' && (
                    <div className="text-center py-10 text-[#6B6B6B]">
                        <p>Brands A-Z</p><p className="text-xs mt-2">Coming soon...</p>
                    </div>
                )}

                {/* Recents */}
                {activeTab === 'recents' && (
                    <div className="space-y-1">
                        {displayFoods.map(food => (
                            <button key={food.id} onClick={() => handleSelectFood(food)} className={`w-full text-left p-3 rounded-xl transition-all border ${selectedFood?.id === food.id ? 'bg-[#3B82F6]/10 border-[#3B82F6]' : 'bg-transparent border-transparent hover:bg-[#1A1A1A]'}`}>
                                <div className="font-medium">{food.name}</div>
                                <div className="text-xs text-[#6B6B6B]">{food.brand} • {Math.round(food.calories_per_100g)} kcal/100g</div>
                            </button>
                        ))}
                        {displayFoods.length === 0 && <div className="text-center text-[#6B6B6B] py-8">No recent foods</div>}
                    </div>
                )}

                {/* Search Results / Category Results */}
                {(searchView === 'results' || selectedCategory) && (
                    <div className="space-y-4">
                        {selectedCategory && <h2 className="text-xl font-bold mb-2">{selectedCategory}</h2>}

                        {/* Favorites List */}
                        {selectedCategory === 'Favorites' && (
                            <div className="space-y-1">
                                {(favorites || []).map(food => (
                                    <button key={food.id} onClick={() => handleSelectFood(food)} className="w-full text-left p-3 rounded-xl hover:bg-[#1A1A1A] border border-transparent hover:border-[#2A2A2A]">
                                        <div className="font-medium">{food.name}</div>
                                        <div className="text-xs text-[#6B6B6B]">{Math.round(food.calories_per_100g)} kcal</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* My Meals List */}
                        {selectedCategory === 'My Meals' && (
                            <div className="space-y-1">
                                {(recipes || []).map(recipe => (
                                    <button key={recipe.id}
                                        onClick={() => {
                                            // Construct pseudo FoodItem from Recipe
                                            handleSelectFood({
                                                id: recipe.id,
                                                name: recipe.name,
                                                brand: 'Homemade',
                                                calories_per_100g: (recipe.total_calories / (recipe.servings_per_recipe || 1)) * 100,
                                                protein_per_100g: recipe.total_protein * 100,
                                                carbs_per_100g: recipe.total_carbs * 100,
                                                fat_per_100g: recipe.total_fat * 100,
                                                serving_size_g: 1,
                                                serving_unit: 'serving',
                                                is_recipe: true,
                                                original_recipe: recipe
                                            } as any);
                                        }}
                                        className="w-full text-left p-3 rounded-xl hover:bg-[#1A1A1A] border border-transparent hover:border-[#2A2A2A]"
                                    >
                                        <div className="font-medium">{recipe.name}</div>
                                        <div className="text-xs text-[#6B6B6B]">{Math.round(recipe.total_calories / (recipe.servings_per_recipe || 1))} kcal/srv</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Normal Categories */}
                        {selectedCategory && !['Favorites', 'My Meals'].includes(selectedCategory) && (
                            <>
                                {/* Sub Cats */}
                                {selectedCategory !== 'Fast Food' && CATEGORIES[selectedCategory]?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-6 px-1">
                                        <button onClick={() => setSelectedSubCategory(null)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${!selectedSubCategory ? 'bg-[#3B82F6] border-[#3B82F6]' : 'bg-[#1A1A1A] border-[#333] text-[#A1A1A1]'}`}>All</button>
                                        {CATEGORIES[selectedCategory].map(sub => (
                                            <button key={sub} onClick={() => setSelectedSubCategory(sub)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${selectedSubCategory === sub ? 'bg-[#3B82F6] border-[#3B82F6]' : 'bg-[#1A1A1A] border-[#333] text-[#A1A1A1]'}`}>{sub}</button>
                                        ))}
                                    </div>
                                )}

                                {/* Results */}
                                <div className="space-y-1">
                                    {displayFoods.map(food => (
                                        <button key={food.id} onClick={() => handleSelectFood(food)}
                                            className={`w-full text-left p-3 rounded-xl transition-all border ${isMultiSelect && selectedItems.some(i => i.food.id === food.id) ? 'bg-[#3B82F6]/20 border-[#3B82F6]' : (selectedFood?.id === food.id ? 'bg-[#3B82F6]/10 border-[#3B82F6]' : 'bg-transparent border-transparent hover:bg-[#1A1A1A]')}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium">{food.name}</div>
                                                    <div className="text-xs text-[#6B6B6B]">{food.brand} • {formatCalories(food.calories_per_100g)} kcal</div>
                                                </div>
                                                {isMultiSelect && (
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedItems.some(i => i.food.id === food.id) ? 'bg-[#3B82F6] border-[#3B82F6]' : 'border-[#6B6B6B]'}`}>
                                                        {selectedItems.some(i => i.food.id === food.id) && <span className="text-white text-xs">✓</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                    {displayFoods.length === 0 && <div className="text-center text-[#6B6B6B] py-8">No results</div>}
                                </div>
                            </>
                        )}

                        {/* General Search */}
                        {!selectedCategory && searchQuery && (
                            <div className="space-y-1">
                                {displayFoods.map(food => (
                                    <button key={food.id} onClick={() => handleSelectFood(food)} className={`w-full text-left p-3 rounded-xl border ${selectedFood?.id === food.id ? 'bg-[#3B82F6]/10 border-[#3B82F6]' : 'bg-transparent border-transparent hover:bg-[#1A1A1A]'}`}>
                                        <div className="font-medium">{food.name}</div>
                                        <div className="text-xs text-[#6B6B6B]">{food.brand} • {formatCalories(food.calories_per_100g)} kcal</div>
                                    </button>
                                ))}
                                {displayFoods.length === 0 && <div className="text-center text-[#6B6B6B] py-8">No results</div>}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Section (Tabs or Selected Food) */}

            {/* If food selected, show sticky footer */}
            {selectedFood && (
                <div className="shrink-0 bg-[#141414] border-t border-[#2A2A2A] p-4 shadow-2xl z-20 sticky bottom-0">
                    <div className="flex bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-1 mb-3">
                        <div className="flex-1 flex items-center px-3 border-r border-[#2A2A2A]">
                            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="bg-transparent text-white text-lg w-full focus:outline-none text-center" placeholder="1" />
                        </div>
                        <div className="px-1 border-r border-[#2A2A2A] bg-[#0A0A0A]">
                            <select value={servingUnit} onChange={e => setServingUnit(e.target.value)} className="bg-transparent text-[#6B6B6B] text-sm font-medium focus:outline-none py-2 pl-2 pr-1 appearance-none cursor-pointer">
                                <option value="serving">servings</option>
                                <option value="g">grams (g)</option>
                                {(selectedFood.category === 'Drink' || ['oz', 'ml', 'tsp', 'tbsp'].includes(selectedFood.serving_unit || '')) && (
                                    <>
                                        <option value="oz">oz</option>
                                        <option value="ml">ml</option>
                                        {['tsp', 'tbsp'].includes(selectedFood.serving_unit || '') && (
                                            <>
                                                <option value="tsp">tsp</option>
                                                <option value="tbsp">tbsp</option>
                                            </>
                                        )}
                                    </>
                                )}
                            </select>
                        </div>
                        <div className="px-4 py-3 text-[#6B6B6B] text-sm font-medium flex items-center bg-[#141414] min-w-[80px] justify-center">
                            = {formatQuantity(parseFloat(quantity || '0') * (servingUnit === 'serving' ? (selectedFood.serving_size_g || 100) : (servingUnit === 'oz' ? 28.35 : servingUnit === 'tsp' ? 4.93 : servingUnit === 'tbsp' ? 14.79 : 1)))} {selectedFood.category === 'Drink' ? 'ml' : 'g'}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={handleToggleFavorite} className={`p-3 rounded-xl bg-[#2A2A2A] min-h-[48px] min-w-[48px] flex items-center justify-center ${favorites?.some(f => f.id === selectedFood.id) ? 'text-red-500' : 'text-[#6B6B6B]'}`}>
                            ♥
                        </button>
                        {(selectedFood as any).is_custom && !(selectedFood as any).is_recipe && (
                            <button onClick={() => navigate('/create-food', { state: { editFood: selectedFood } })} className="p-3 rounded-xl bg-[#2A2A2A] text-[#6B6B6B] hover:text-white min-h-[48px] flex items-center justify-center">
                                ✎
                            </button>
                        )}
                        <button onClick={handleAddSingle} className="flex-1 bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold py-3 rounded-xl min-h-[48px]">
                            Add Food
                        </button>
                    </div>
                </div>
            )}

            {/* Multi select action */}
            {isMultiSelect && selectedItems.length > 0 && !showReview && (
                <div className="fixed bottom-24 left-4 right-4 z-20">
                    <button onClick={() => setShowReview(true)} className="w-full bg-[#3B82F6] text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                        Review {selectedItems.length} Items
                    </button>
                </div>
            )}

            {/* Review Modal Overlay */}
            {showReview && (
                <div className="fixed inset-0 z-50 bg-[#141414] flex flex-col">
                    <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between safe-top">
                        <h2 className="text-white font-bold text-lg">Review Selection</h2>
                        <button onClick={() => setShowReview(false)} className="text-[#6B6B6B]">Close</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {selectedItems.map((item, index) => {
                            // Determine available units based on food properties
                            const isDrink = item.food.category === 'Drink' || ['oz', 'ml'].includes(item.food.serving_unit || '');

                            // Calculate nutrition preview
                            const qty = item.quantity;
                            let quantityInGrams = qty;
                            if (item.unit === 'serving') {
                                quantityInGrams = qty * (item.food.serving_size_g || 100);
                            } else if (item.unit === 'oz') {
                                quantityInGrams = qty * 28.3495;
                            } else if (item.unit === 'ml') {
                                quantityInGrams = qty;
                            }
                            const ratio = quantityInGrams / 100;
                            const calories = Math.round((item.food.calories_per_100g || 0) * ratio);

                            return (
                                <div key={index} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
                                    {/* Food Info */}
                                    <div className="p-3 border-b border-[#2A2A2A] flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="font-medium text-white">{item.food.name}</div>
                                            {item.food.brand && (
                                                <div className="text-xs text-[#6B6B6B] mt-0.5">{item.food.brand}</div>
                                            )}
                                            <div className="text-sm text-[#3B82F6] mt-1">{calories} cal</div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedItems(prev => prev.filter((_, i) => i !== index))}
                                            className="text-[#6B6B6B] hover:text-red-500 p-1"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* Serving Size Adjustment */}
                                    <div className="p-3">
                                        <div className="text-xs text-[#6B6B6B] mb-2">Serving Size</div>
                                        <div className="flex bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] overflow-hidden">
                                            {/* Quantity Input */}
                                            <div className="flex-1 flex items-center px-3 border-r border-[#2A2A2A]">
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => {
                                                        const newQty = parseFloat(e.target.value) || 0;
                                                        setSelectedItems(prev => prev.map((it, i) =>
                                                            i === index ? { ...it, quantity: newQty } : it
                                                        ));
                                                    }}
                                                    className="bg-transparent text-white text-base w-full focus:outline-none text-center"
                                                    placeholder="1"
                                                    step="0.1"
                                                />
                                            </div>

                                            {/* Unit Selector */}
                                            <div className="flex-1">
                                                <select
                                                    value={item.unit}
                                                    onChange={e => {
                                                        setSelectedItems(prev => prev.map((it, i) =>
                                                            i === index ? { ...it, unit: e.target.value } : it
                                                        ));
                                                    }}
                                                    className="bg-transparent text-[#6B6B6B] text-sm font-medium focus:outline-none py-3 px-2 w-full appearance-none cursor-pointer"
                                                >
                                                    <option value="serving">servings</option>
                                                    <option value="g">grams (g)</option>
                                                    {isDrink && (
                                                        <>
                                                            <option value="oz">oz</option>
                                                            <option value="ml">ml</option>
                                                        </>
                                                    )}
                                                </select>
                                            </div>

                                            {/* Grams Display */}
                                            <div className="px-3 py-3 text-[#6B6B6B] text-xs bg-[#141414] min-w-[70px] text-center border-l border-[#2A2A2A]">
                                                = {formatQuantity(quantityInGrams)} g
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="p-4 border-t border-[#2A2A2A] bg-[#141414] pb-safe-bottom">
                        <button onClick={handleAddMulti} className="w-full bg-[#3B82F6] text-white font-bold py-3.5 rounded-xl">
                            Confirm & Log
                        </button>
                    </div>
                </div>
            )}

            {/* Fixed Footer Tabs (Only when nothing selected) */}
            {!selectedFood && !showReview && (
                <div className="shrink-0 border-t border-[#2A2A2A] bg-[#141414] px-4 pb-safe-bottom grid grid-cols-2 gap-2 sticky bottom-0">
                    <button onClick={() => { setActiveTab('search'); setSearchView('categories'); }} className={`py-3 flex flex-col items-center gap-1 ${activeTab === 'search' ? 'text-[#3B82F6]' : 'text-[#6B6B6B]'}`}>
                        <span className="text-sm font-medium">Search</span>
                    </button>
                    <button onClick={() => setActiveTab('recents')} className={`py-3 flex flex-col items-center gap-1 ${activeTab === 'recents' ? 'text-[#3B82F6]' : 'text-[#6B6B6B]'}`}>
                        <span className="text-sm font-medium">Recent</span>
                    </button>
                </div>
            )}

        </div>
    );
}
