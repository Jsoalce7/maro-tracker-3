import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FoodItem, MealType } from '../../types';
import { useFood } from '../../hooks/useFood';
import { useRecipes } from '../../hooks/useRecipes';
import { formatCalories, formatQuantity } from '../../lib/format';
import { useNutrition } from '../../hooks/useNutrition';
import { useNavBarStore } from '../../stores/navBarStore';
import { getTodayLocal } from '../../utils/date';

// Import the same constants from AddFoodModal
const CATEGORY_ORDER = [
    'Favorites',
    'My Meals',
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
    'Snack': ['Chips', 'Cookies', 'Candy', 'Dessert', 'Protein Bar', 'Healthy Snacks', 'Nuts', 'Crackers'],
    'Drink': ['Water', 'Soda', 'Coffee', 'Tea', 'Energy Drink', 'Electrolytes', 'Alcohol', 'Juice', 'Smoothie', 'Protein Shake'],
    'Ingredients': ['Protein', 'Dairy', 'Carbs', 'Fats', 'Misc'],
    'Fruit': ['Fresh', 'Dried', 'Frozen'],
    'Vegetable': ['Fresh', 'Frozen', 'Canned'],
    'Fast Food': [],
    'Other': []
};

/**
 * iOS Full-Screen Add Food Page
 * Full implementation with food database
 */
export function AddFoodPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const mealType = (searchParams.get('meal') as MealType) || undefined;
    const mode = (searchParams.get('mode') as 'add' | 'manage') || 'add';

    const today = getTodayLocal();
    const { addEntry, dayLog } = useNutrition(today);
    const { searchFoods, recentFoods, favorites, deleteCustomFood, toggleFavorite } = useFood();
    const { recipes, deleteRecipe } = useRecipes();

    // State (same as AddFoodModal)
    const [activeTab, setActiveTab] = useState<'search' | 'recents'>('search');
    const [searchView, setSearchView] = useState<'categories' | 'brands' | 'results'>('categories');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
    const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
    const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
    const [quantity, setQuantity] = useState('1');
    const [servingUnit, setServingUnit] = useState('serving');
    const [isMultiSelect, setIsMultiSelect] = useState(false);
    const [selectedItems, setSelectedItems] = useState<{ food: FoodItem, quantity: number, unit: string }[]>([]);
    const [showReview, setShowReview] = useState(false);

    // Search Query
    const { data: searchResults, isLoading: isSearching } = useQuery({
        queryKey: ['foodSearch', searchQuery, selectedCategory, selectedSubCategory],
        queryFn: () => searchFoods(searchQuery, selectedCategory || 'All'),
        enabled: true,
        staleTime: 1000 * 60,
    });

    // Auto-switch to results when typing
    useEffect(() => {
        if (searchQuery.length > 0) {
            setSearchView('results');
        } else if (searchQuery.length === 0 && !selectedCategory) {
            setSearchView('categories');
        }
    }, [searchQuery]);

    // Hide nav bar on mount, show on unmount (iOS page lifecycle)
    const { hideNavBar, showNavBar } = useNavBarStore();
    useEffect(() => {
        hideNavBar();
        return () => showNavBar();
    }, [hideNavBar, showNavBar]);


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
        if (searchQuery) {
            setSearchQuery('');
            return;
        }
        if (selectedCategory) {
            setSelectedCategory(null);
            setSearchView('categories');
            return;
        }
        navigate(-1); // Back to Home/Diary
    };

    const handleAdd = () => {
        if (!selectedFood || !mealType) return;

        const qty = parseFloat(quantity) || 0;

        // Get the meal for this meal type
        if (!dayLog) return;

        const meal = dayLog.meals.find(m => m.meal_type === mealType);
        if (!meal) {
            console.error('Meal not found for type:', mealType);
            return;
        }

        // Calculate nutrition based on quantity
        const ratio = qty / 100;
        const nutrition = {
            calories: (selectedFood.calories_per_100g || 0) * ratio,
            protein: (selectedFood.protein_per_100g || 0) * ratio,
            carbs: (selectedFood.carbs_per_100g || 0) * ratio,
            fat: (selectedFood.fat_per_100g || 0) * ratio,
        };

        const caffeine_mg = (selectedFood.caffeine_mg || 0) * ratio;

        // Determine water content
        let water_ml = 0;
        if (selectedFood.category === 'Drink') {
            const isWater =
                (selectedFood.tags && selectedFood.tags.includes('Water')) ||
                selectedFood.name.toLowerCase().includes('water') ||
                selectedFood.name.toLowerCase() === 'water';

            if (isWater) {
                if (servingUnit === 'ml') water_ml = qty;
                else if (servingUnit === 'oz') water_ml = qty * 29.5735;
                else water_ml = qty;
            }
        }

        const isRecipe = (selectedFood as any).is_recipe;
        const isCustom = (selectedFood as any).is_custom;

        addEntry({
            mealId: meal.id,
            foodId: (isCustom || isRecipe) ? undefined : selectedFood.id,
            customFoodId: (isCustom && !isRecipe) ? selectedFood.id : undefined,
            recipeId: (isRecipe) ? selectedFood.id : undefined,
            quantity: Number(qty) || 0,
            nutrition,
            caffeine_mg,
            water_ml,
            metric_quantity: Number(qty),
            metric_unit: servingUnit,
        });

        navigate(-1);
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

    // Filter display foods
    let displayFoods: FoodItem[] = [];
    if (activeTab === 'recents') {
        displayFoods = recentFoods || [];
    } else {
        if (searchView === 'results' || selectedCategory) {
            displayFoods = searchResults || [];
            if (selectedSubCategory) {
                displayFoods = displayFoods.filter(f =>
                    f.name.toLowerCase().includes(selectedSubCategory.toLowerCase()) ||
                    (f.tags && f.tags.includes(selectedSubCategory)) ||
                    (f.category === 'Ingredients' && f.ingredient_type === selectedSubCategory)
                );
            }
            if (selectedCategory === 'Fast Food' && selectedRestaurant) {
                displayFoods = displayFoods.filter(f => f.restaurant === selectedRestaurant);
            }
        }
    }

    return (
        <div className="min-h-screen min-h-[100dvh] bg-[#0F0F0F] page-container flex flex-col">
            {/* Header */}
            <div className="shrink-0 p-4 pb-3 modal-header-safe border-b border-[#2A2A2A] bg-[#141414] z-10 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {(selectedCategory || selectedFood || searchQuery) && (
                            <button onClick={handleBack} className="text-[#6B6B6B] hover:text-white">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        <h2 className="text-white font-semibold">
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
                        <button onClick={() => navigate(-1)} className="text-[#6B6B6B] hover:text-white p-1">✕</button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search foods, brands, meals..."
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-3 text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#3B82F6]"
                    />
                </div>

                {/* Category/Brand Tabs */}
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

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {/* Categories View */}
                {activeTab === 'search' && searchView === 'categories' && !selectedCategory && !searchQuery && (
                    <div className="space-y-2">
                        {CATEGORY_ORDER.map(cat => {
                            if (cat === 'Favorites') {
                                const favItems = favorites || [];
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => { setSelectedCategory(cat); setSearchView('results'); }}
                                        className="w-full text-left p-4 rounded-xl bg-[#2A2A2A] hover:bg-[#333] transition-colors flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>❤️</span>
                                            <span className="font-medium text-white">{cat}</span>
                                        </div>
                                        <span className="text-xs text-[#6B6B6B] group-hover:text-white">{favItems.length} items</span>
                                    </button>
                                );
                            }

                            if (cat === 'My Meals') {
                                const mealItems = recipes || [];
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => { setSelectedCategory(cat); setSearchView('results'); }}
                                        className="w-full text-left p-4 rounded-xl bg-[#2A2A2A] hover:bg-[#333] transition-colors flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>🍽️</span>
                                            <span className="font-medium text-white">{cat}</span>
                                        </div>
                                        <span className="text-xs text-[#6B6B6B] group-hover:text-white">{mealItems.length} items</span>
                                    </button>
                                );
                            }

                            return (
                                <button
                                    key={cat}
                                    onClick={() => { setSelectedCategory(cat); setSearchView('results'); }}
                                    className="w-full text-left p-4 rounded-xl bg-[#2A2A2A] hover:bg-[#333] transition-colors flex items-center justify-between group"
                                >
                                    <span className="font-medium text-white">{cat}</span>
                                    <span className="text-[#6B6B6B] group-hover:text-white">→</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Search Results / Food List */}
                {(searchView === 'results' || searchQuery || selectedCategory) && !selectedFood && (
                    <div className="space-y-2">
                        {displayFoods.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-[#6B6B6B]">No foods found</p>
                            </div>
                        ) : (
                            displayFoods.map(food => (
                                <button
                                    key={food.id}
                                    onClick={() => handleSelectFood(food)}
                                    className="w-full text-left p-4 rounded-xl bg-[#2A2A2A] hover:bg-[#333] transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-white">{food.name}</p>
                                            <p className="text-xs text-[#6B6B6B]">{formatCalories(food.calories_per_100g)} • {food.protein_per_100g}p {food.carbs_per_100g}c {food.fat_per_100g}f</p>
                                        </div>
                                        <span className="text-[#6B6B6B]">→</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}

                {/* Food Detail View */}
                {selectedFood && (
                    <div className="space-y-4">
                        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                            <h3 className="text-white font-semibold text-lg mb-2">{selectedFood.name}</h3>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div>
                                    <p className="text-base font-bold text-[#3B82F6]">{Math.round(selectedFood.calories_per_100g)}</p>
                                    <p className="text-[10px] text-[#6B6B6B]">kcal</p>
                                </div>
                                <div>
                                    <p className="text-base font-bold text-[#EF4444]">{selectedFood.protein_per_100g}g</p>
                                    <p className="text-[10px] text-[#6B6B6B]">Protein</p>
                                </div>
                                <div>
                                    <p className="text-base font-bold text-[#10B981]">{selectedFood.carbs_per_100g}g</p>
                                    <p className="text-[10px] text-[#6B6B6B]">Carbs</p>
                                </div>
                                <div>
                                    <p className="text-base font-bold text-[#F59E0B]">{selectedFood.fat_per_100g}g</p>
                                    <p className="text-[10px] text-[#6B6B6B]">Fat</p>
                                </div>
                            </div>
                        </div>

                        {/* Quantity Input */}
                        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                            <label className="text-white font-medium mb-2 block">Quantity</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="flex-1 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white"
                                />
                                <select
                                    value={servingUnit}
                                    onChange={(e) => setServingUnit(e.target.value)}
                                    className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white"
                                >
                                    <option value="serving">servings</option>
                                    <option value="g">g</option>
                                    <option value="oz">oz</option>
                                    <option value="ml">ml</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            {selectedFood && (
                <div className="shrink-0 p-4 pb-safe border-t border-[#2A2A2A] bg-[#141414]">
                    <button
                        onClick={handleAdd}
                        className="w-full py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold rounded-lg transition-colors"
                    >
                        Add to {mealType}
                    </button>
                </div>
            )}
        </div>
    );
}
