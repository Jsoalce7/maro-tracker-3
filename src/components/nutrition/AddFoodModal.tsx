
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FoodItem, MealType } from '../../types';
import { useFood } from '../../hooks/useFood';
import { useRecipes } from '../../hooks/useRecipes';
import { formatCalories, formatQuantity } from '../../lib/format';

interface AddFoodModalProps {
    mealType?: MealType;
    onClose: () => void;
    onAddFood?: (food: FoodItem, quantity: number, unit: string, isCustom?: boolean, isRecipe?: boolean) => void;
    mode?: 'add' | 'manage';
    initialFoodId?: string;
}

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

// Only Tabs needed now
type Tab = 'search'; // We might keep 'recents' hidden or merged? Prompt says "Search tab becomes the primary tab... No need for multiple tabs". 
// But "Tabs Should Be Only: Recent and Search" was previous prompt. 
// New prompt: "Search tab should now contain only: Categories (default), Brands (A-Z)"
// "Search tab UI should now behave as the single source". 
// Let's stick to just Search as the main view concept, maybe 'recents' is a section or a sub-tab if needed, but the prompt implies a single unified view or just 'Search' tab active.
// Let's interpret "Default Tab Behavior... open directly into Search" as Search is the Main one.
// Let's keep Recents as a toggle or sub-view if useful, or just follow the strict "Search tab structure" which lists "Categories (default) | Brands".
// Actually, earlier prompt said "Tabs Should Be Only: Recent and Search". Current prompt says "Default Tab ... Search".
// Let's keep 'Search' and 'Recents' as top tabs for safety but default to Search.

const mealLabels: Record<MealType, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snacks: 'Snacks',
};

// Category Definitions
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

export function AddFoodModal({ mealType, onClose, onAddFood, mode }: AddFoodModalProps) {
    const navigate = useNavigate();
    const { searchFoods, recentFoods, favorites, deleteCustomFood, toggleFavorite } = useFood();
    const { recipes, deleteRecipe } = useRecipes();

    // Tab State
    const [activeTab, setActiveTab] = useState<'search' | 'recents' | 'library'>('search');

    // Search Sub-View
    const [searchView, setSearchView] = useState<'categories' | 'brands' | 'results'>('categories');

    // Search & Filter State
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
    const { data: searchResults, isLoading: isSearching } = useQuery({
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
        // If in manage mode, navigate to edit directly or open details? 
        // "Manage Food open the database in Edit/Manage Mode... Editing foods... Adding new foods... Cleaning up".
        // If mode === 'manage', clicking should probably open Edit screen or a "Manage Item" view.
        // Let's assume standard details view but with "Edit" primary action instead of "Add".

        if (isMultiSelect && mode !== 'manage') {
            // Toggle selection with default serving
            if (selectedItems.some(i => i.food.id === food.id)) {
                setSelectedItems(prev => prev.filter(i => i.food.id !== food.id));
            } else {
                // Add with default
                // Add with default
                setSelectedItems(prev => [...prev, {
                    food,
                    quantity: 1,
                    unit: 'serving'
                }]);
            }
            return;
        }

        setSelectedFood(food);
        if ((food as any).is_recipe) {
            setQuantity('1');
            setServingUnit('serving');
        } else {
            // Default to 'serving' as per new UI requirement
            setQuantity('1');
            setServingUnit('serving');
        }
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
        if (onClose) onClose(); // Top level closes
    };

    const handleAdd = () => {
        if (!selectedFood || !onAddFood) return;
        const qty = parseFloat(quantity) || 0;
        const isRecipe = (selectedFood as any).is_recipe;
        const isCustom = (selectedFood as any).is_custom;
        onAddFood(selectedFood, qty, servingUnit, isCustom, isRecipe);
        onClose();
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

    // Filter Logic for Display
    let displayFoods: FoodItem[] = [];
    if (activeTab === 'recents') {
        displayFoods = recentFoods || [];
    } else {
        // Search Tab
        if (searchView === 'results' || selectedCategory) {
            displayFoods = searchResults || [];

            // Sub-category client-side filter
            if (selectedSubCategory) {
                displayFoods = displayFoods.filter(f =>
                    f.name.toLowerCase().includes(selectedSubCategory.toLowerCase()) ||
                    (f.tags && f.tags.includes(selectedSubCategory)) ||
                    (f.category === 'Ingredients' && f.ingredient_type === selectedSubCategory)
                );
            }
            // Fast Food Grouping Logic
            if (selectedCategory === 'Fast Food' && selectedRestaurant) {
                displayFoods = displayFoods.filter(f => f.restaurant === selectedRestaurant);
            }
        }
    }


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 lg:p-4" style={{ touchAction: 'none' }}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-[#141414] w-full h-full max-h-full lg:h-auto lg:max-h-[90vh] lg:max-w-md lg:rounded-2xl flex flex-col overflow-hidden shadow-2xl border-0 lg:border border-[#2A2A2A]">

                {/* Header */}
                <div className="shrink-0 p-4 pb-3 modal-header-safe border-b border-[#2A2A2A] bg-[#141414] z-10 space-y-4">
                    <div className="flex items-center justify-between">
                        {/* Back / Title Logic */}
                        <div className="flex items-center gap-2">
                            {(selectedCategory || selectedFood || searchQuery) && (
                                <button onClick={handleBack} className="text-[#6B6B6B] hover:text-white">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
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
                            <button onClick={onClose} className="text-[#6B6B6B] hover:text-white p-1">✕</button>
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
                            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl py-3 pl-10 pr-4 text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#3B82F6]"
                        />
                    </div>

                    {/* Create Buttons (Moved under Search) */}
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { onClose(); navigate('/create-food'); }} className="bg-[#2A2A2A] hover:bg-[#333] text-white py-3 sm:py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-colors min-h-[44px]">
                            <span>+</span> Create Food
                        </button>
                        <button onClick={() => { onClose(); navigate('/create-recipe'); }} className="bg-[#2A2A2A] hover:bg-[#333] text-white py-3 sm:py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-colors min-h-[44px]">
                            <span>+</span> Create Meal
                        </button>
                    </div>

                    {/* Top Level Chips (Categories vs Brands) - Only in Search Tab */}
                    {activeTab === 'search' && !searchQuery && !selectedCategory && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSearchView('categories')}
                                className={`flex-1 py-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] sm:min-h-0 ${searchView === 'categories' ? 'bg-[#3B82F6] text-white' : 'bg-[#1A1A1A] text-[#6B6B6B] border border-[#2A2A2A]'}`}
                            >
                                Categories
                            </button>
                            {/* Hidden Brands for now as per prompt "Brands (A-Z)" just being a placeholder or separate view needed */}
                            <button
                                onClick={() => setSearchView('brands')}
                                className={`flex-1 py-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] sm:min-h-0 ${searchView === 'brands' ? 'bg-[#3B82F6] text-white' : 'bg-[#1A1A1A] text-[#6B6B6B] border border-[#2A2A2A]'}`}
                            >
                                Brands
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

                    {/* Categories View */}
                    {activeTab === 'search' && searchView === 'categories' && !selectedCategory && !searchQuery && (
                        <div className="space-y-2">

                            {/* All Category Chips - In Precise Order */}
                            {CATEGORY_ORDER.map(cat => {
                                if (cat === 'Favorites') {
                                    return (
                                        <button
                                            key="fav"
                                            onClick={() => { setSelectedCategory('Favorites'); setSearchView('results'); }}
                                            className="w-full flex justify-between items-center p-4 sm:p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#222] transition-colors min-h-[56px]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-red-500">♥</span>
                                                <span className="font-medium text-white">Favorites</span>
                                            </div>
                                            <span className="text-[#6B6B6B] text-xs">{(favorites || []).length} items</span>
                                        </button>
                                    );
                                }
                                if (cat === 'My Meals') {
                                    return (
                                        <button
                                            key="meals"
                                            onClick={() => { setSelectedCategory('My Meals'); setSearchView('results'); }}
                                            className="w-full flex justify-between items-center p-4 sm:p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#222] transition-colors min-h-[56px]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-blue-500">🍽</span>
                                                <span className="font-medium text-white">My Meals</span>
                                            </div>
                                            <span className="text-[#6B6B6B] text-xs">{(recipes || []).length} items</span>
                                        </button>
                                    );
                                }
                                // Standard Categories
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className="w-full flex justify-between items-center p-4 sm:p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#222] transition-colors min-h-[56px]"
                                    >
                                        <span className="font-medium text-white">{cat}</span>
                                        <span className="text-[#6B6B6B] transform rotate-90">›</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}


                    {/* Brands View (Placeholder) */}
                    {activeTab === 'search' && searchView === 'brands' && (
                        <div className="text-center py-10 text-[#6B6B6B]">
                            <p>Brands A-Z</p>
                            <p className="text-xs mt-2">Coming soon...</p>
                        </div>
                    )}

                    {/* Recents View */}
                    {activeTab === 'recents' && (
                        <div className="space-y-1">
                            {displayFoods.map(food => (
                                <button
                                    key={food.id}
                                    onClick={() => handleSelectFood(food)}
                                    className={`w-full text-left p-3 rounded-xl transition-all border ${selectedFood?.id === food.id ? 'bg-[#3B82F6]/10 border-[#3B82F6]' : 'bg-transparent border-transparent hover:bg-[#1A1A1A]'}`}
                                >
                                    <div className="font-medium text-white">{food.name}</div>
                                    <div className="text-xs text-[#6B6B6B]">
                                        {food.brand ? `${food.brand} • ` : ''}
                                        {formatCalories(food.calories_per_100g * ((food.serving_size_g || 100) / 100))} kcal
                                        {food.serving_unit && food.serving_unit !== 'g' && food.serving_unit !== 'serving' && (
                                            <span className="ml-1 text-[#6B6B6B]/80">
                                                ({formatQuantity(food.serving_unit === 'oz' ? (food.serving_size_g || 0) / 28.35 : (food.serving_size_g || 0))} {food.serving_unit})
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                            {displayFoods.length === 0 && <div className="text-center text-[#6B6B6B] py-8">No recent foods</div>}
                        </div>
                    )}

                    {/* Filtered Results / Search Results */}
                    {(searchView === 'results' || selectedCategory) && (
                        <div className="space-y-4">
                            {/* Header / Back - Removed local back button in favor of unified top bar back */}
                            {/* But we might want context specific header? The top bar handles global back. */}
                            {/* Let's clear the local back button to avoid duplication and confusion */}

                            {selectedCategory && <h2 className="text-xl font-bold text-white mb-2">{selectedCategory}</h2>}

                            {/* Special Handling for Favorites List */}
                            {selectedCategory === 'Favorites' && (
                                <div className="space-y-1">
                                    {(favorites || []).map(food => (
                                        <button
                                            key={food.id}
                                            onClick={() => handleSelectFood(food)}
                                            className="w-full text-left p-3 rounded-xl hover:bg-[#1A1A1A] transition-colors border border-transparent hover:border-[#2A2A2A]"
                                        >
                                            <div className="font-medium text-white">{food.name}</div>
                                            <div className="text-xs text-[#6B6B6B]">
                                                {Math.round(food.calories_per_100g)} kcal
                                            </div>
                                        </button>
                                    ))}
                                    {(favorites || []).length === 0 && <div className="text-center text-[#6B6B6B] py-4">No favorites yet</div>}
                                </div>
                            )}

                            {/* Special Handling for My Meals List */}
                            {selectedCategory === 'My Meals' && (
                                <div className="space-y-1">
                                    {(recipes || []).map(recipe => (
                                        <button
                                            key={recipe.id}
                                            onClick={() => {
                                                const foodItem: FoodItem = {
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
                                                } as any;
                                                handleSelectFood(foodItem);
                                            }}
                                            className="w-full text-left p-3 rounded-xl hover:bg-[#1A1A1A] transition-colors border border-transparent hover:border-[#2A2A2A]"
                                        >
                                            <div className="font-medium text-white">{recipe.name}</div>
                                            <div className="text-xs text-[#6B6B6B]">
                                                {Math.round(recipe.total_calories / (recipe.servings_per_recipe || 1))} kcal per serving
                                            </div>
                                        </button>
                                    ))}
                                    {(recipes || []).length === 0 && <div className="text-center text-[#6B6B6B] py-4">No meals created yet</div>}
                                </div>
                            )}

                            {/* Normal Categories */}
                            {selectedCategory && !['Favorites', 'My Meals'].includes(selectedCategory) && (
                                <>
                                    {/* Sub-categories */}
                                    {selectedCategory !== 'Fast Food' && CATEGORIES[selectedCategory] && CATEGORIES[selectedCategory].length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-6 px-1">
                                            <button
                                                onClick={() => setSelectedSubCategory(null)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${!selectedSubCategory ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-[#1A1A1A] border-[#333] text-[#A1A1A1]'}`}
                                            >
                                                All
                                            </button>
                                            {CATEGORIES[selectedCategory].map(sub => (
                                                <button
                                                    key={sub}
                                                    onClick={() => setSelectedSubCategory(sub)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${selectedSubCategory === sub ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-[#1A1A1A] border-[#333] text-[#A1A1A1]'}`}
                                                >
                                                    {sub}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Fast Food Restaurant List */}
                                    {selectedCategory === 'Fast Food' && !selectedRestaurant && (
                                        <div className="space-y-2">
                                            {Array.from(new Set((searchResults || []).map(f => f.restaurant || 'Other'))).sort().map(r => (
                                                <button
                                                    key={r}
                                                    onClick={() => setSelectedRestaurant(r)}
                                                    className="w-full text-left p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white hover:bg-[#222]"
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Results List */}
                                    {(selectedCategory !== 'Fast Food' || selectedRestaurant) && (
                                        <div className="space-y-1">
                                            {displayFoods.map(food => (
                                                <button
                                                    key={food.id}
                                                    onClick={() => handleSelectFood(food)}
                                                    className={`w-full text-left p-3 rounded-xl transition-all border ${isMultiSelect && selectedItems.some(i => i.food.id === food.id)
                                                        ? 'bg-[#3B82F6]/20 border-[#3B82F6]'
                                                        : (selectedFood?.id === food.id ? 'bg-[#3B82F6]/10 border-[#3B82F6]' : 'bg-transparent border-transparent hover:bg-[#1A1A1A]')
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="font-medium text-white">{food.name}</div>
                                                            <div className="text-xs text-[#6B6B6B]">
                                                                {food.brand} • {formatCalories(food.calories_per_100g * ((food.serving_size_g || 100) / 100))} kcal
                                                                {food.serving_unit && food.serving_unit !== 'g' && food.serving_unit !== 'serving' && (
                                                                    <span className="ml-1 text-[#6B6B6B]/80">
                                                                        ({formatQuantity(food.serving_unit === 'oz' ? (food.serving_size_g || 0) / 28.35 : (food.serving_size_g || 0))} {food.serving_unit})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {isMultiSelect && (
                                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedItems.some(i => i.food.id === food.id) ? 'bg-[#3B82F6] border-[#3B82F6]' : 'border-[#6B6B6B]'
                                                                }`}>
                                                                {selectedItems.some(i => i.food.id === food.id) && (
                                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                            {displayFoods.length === 0 && <div className="text-center text-[#6B6B6B] py-8">No results in this category</div>}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* General Search Results (No Category) */}
                            {!selectedCategory && searchQuery && (
                                <div className="space-y-1">
                                    {displayFoods.map(food => (
                                        <button
                                            key={food.id}
                                            onClick={() => handleSelectFood(food)}
                                            className={`w-full text-left p-3 rounded-xl transition-all border ${selectedFood?.id === food.id ? 'bg-[#3B82F6]/10 border-[#3B82F6]' : 'bg-transparent border-transparent hover:bg-[#1A1A1A]'}`}
                                        >
                                            <div className="font-medium text-white">{food.name}</div>
                                            <div className="text-xs text-[#6B6B6B]">
                                                {food.restaurant && <span className="text-[#3B82F6] mr-1">{food.restaurant} •</span>}
                                                {food.brand} • {formatCalories(food.calories_per_100g * ((food.serving_size_g || 100) / 100))} kcal
                                            </div>
                                        </button>
                                    ))}
                                    {displayFoods.length === 0 && <div className="text-center text-[#6B6B6B] py-8">No results found</div>}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Selected Item Footer */}
                {selectedFood && (
                    <div className="shrink-0 bg-[#141414] border-t border-[#2A2A2A] p-4 animate-slide-up">
                        <div className="flex bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-1 mb-3">
                            <div className="flex-1 flex items-center px-3 border-r border-[#2A2A2A]">
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    className="bg-transparent text-white text-lg w-full focus:outline-none text-center"
                                    placeholder="1"
                                />
                            </div>
                            <div className="px-1 border-r border-[#2A2A2A] bg-[#0A0A0A]">
                                <select
                                    value={servingUnit}
                                    onChange={e => setServingUnit(e.target.value)}
                                    className="bg-transparent text-[#6B6B6B] text-sm font-medium focus:outline-none py-2 pl-2 pr-1 appearance-none cursor-pointer"
                                >
                                    <option value="serving">servings</option>
                                    <option value="g">grams (g)</option>
                                    {/* Drinks or generic Oz/Ml support */}
                                    {(selectedFood.category === 'Drink' || ['oz', 'ml', 'fl oz'].includes(selectedFood.serving_unit || '')) && (
                                        <>
                                            <option value="oz">oz</option>
                                            <option value="ml">ml</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div className="px-4 py-3 text-[#6B6B6B] text-sm font-medium flex items-center bg-[#141414] min-w-[80px] justify-center">
                                = {(() => {
                                    const qty = parseFloat(quantity) || 0;
                                    const baseGrams = selectedFood.serving_size_g || 100;
                                    let totalGrams = 0;

                                    if (servingUnit === 'serving') {
                                        totalGrams = qty * baseGrams;
                                    } else if (servingUnit === 'g') {
                                        totalGrams = qty;
                                    } else if (servingUnit === 'oz') {
                                        totalGrams = qty * 28.3495;
                                    } else if (servingUnit === 'ml') {
                                        totalGrams = qty; // approx
                                    }
                                    return formatQuantity(totalGrams);
                                })()} g
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleToggleFavorite}
                                className={`p-3 sm:p-2.5 rounded-xl bg-[#2A2A2A] hover:text-white transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center ${favorites?.some(f => f.id === selectedFood.id) ? 'text-red-500' : 'text-[#6B6B6B]'}`}
                            >
                                <svg className="w-6 h-6" fill={favorites?.some(f => f.id === selectedFood.id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                            </button>
                            {(selectedFood as any).is_custom && !((selectedFood as any).is_recipe) && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate('/create-food', { state: { editFood: selectedFood } });
                                    }}
                                    className="p-3 sm:p-2.5 rounded-xl bg-[#2A2A2A] text-[#6B6B6B] hover:text-white transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                                    title="Edit Food"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                            )}
                            <button
                                onClick={handleAdd}
                                className="flex-1 bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold py-3.5 sm:py-3 rounded-xl transition-colors min-h-[48px]"
                            >
                                Add Food
                            </button>
                        </div>
                    </div>
                )}

                {/* Multi-Select Floating Action Button or Footer */}
                {isMultiSelect && selectedItems.length > 0 && !showReview && (
                    <div className="absolute bottom-20 left-4 right-4 animate-slide-up z-20">
                        <button
                            onClick={() => setShowReview(true)}
                            className="w-full bg-[#3B82F6] text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                        >
                            Review {selectedItems.length} Items
                        </button>
                    </div>
                )}

                {/* Review Modal / Screen Overlay */}
                {showReview && (
                    <div className="absolute inset-0 z-30 bg-[#141414] flex flex-col animate-slide-up">
                        <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
                            <h2 className="text-white font-bold text-lg">Review Selection</h2>
                            <button onClick={() => setShowReview(false)} className="text-[#6B6B6B]">Close</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {selectedItems.map((item, index) => (
                                <div key={index} className="bg-[#1A1A1A] p-3 rounded-xl border border-[#2A2A2A] flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div className="font-medium text-white">{item.food.name}</div>
                                        <button
                                            onClick={() => setSelectedItems(prev => prev.filter((_, i) => i !== index))}
                                            className="text-[#6B6B6B] hover:text-red-500"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3 text-sm flex-wrap">
                                        <div className="flex items-center bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] px-1">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setSelectedItems(prev => {
                                                        const next = [...prev];
                                                        next[index] = { ...next[index], quantity: val };
                                                        return next;
                                                    });
                                                }}
                                                className="bg-transparent w-12 text-center text-white focus:outline-none p-1"
                                            />
                                            <select
                                                value={item.unit}
                                                onChange={(e) => {
                                                    const newUnit = e.target.value;
                                                    setSelectedItems(prev => {
                                                        const next = [...prev];
                                                        next[index] = { ...next[index], unit: newUnit };
                                                        return next;
                                                    });
                                                }}
                                                className="bg-transparent text-[#6B6B6B] text-xs focus:outline-none py-1 pr-1 cursor-pointer"
                                            >
                                                <option value="serving">svgs</option>
                                                <option value="g">g</option>
                                                {(item.food.category === 'Drink' || ['oz', 'ml', 'fl oz'].includes(item.food.serving_unit || '')) && (
                                                    <>
                                                        <option value="oz">oz</option>
                                                        <option value="ml">ml</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>

                                        <div className="text-[#6B6B6B]">
                                            ({(() => {
                                                const qty = item.quantity;
                                                const baseGrams = item.food.serving_size_g || 100;
                                                let totalGrams = 0;
                                                if (item.unit === 'serving') totalGrams = qty * baseGrams;
                                                else if (item.unit === 'g') totalGrams = qty;
                                                else if (item.unit === 'oz') totalGrams = qty * 28.3495;
                                                else if (item.unit === 'ml') totalGrams = qty;
                                                return formatQuantity(totalGrams);
                                            })()} g)
                                        </div>

                                        <div className="text-white ml-auto font-medium">
                                            {(() => {
                                                const qty = item.quantity;
                                                const baseGrams = item.food.serving_size_g || 100;
                                                let multiplier = 1;

                                                if (item.unit === 'serving') multiplier = qty;
                                                else if (item.unit === 'g') multiplier = qty / baseGrams;
                                                else if (item.unit === 'oz') multiplier = (qty * 28.3495) / baseGrams;
                                                else if (item.unit === 'ml') multiplier = qty / baseGrams;

                                                return formatCalories(multiplier * (item.food.calories_per_100g || 0) * (baseGrams / 100));
                                            })()} kcal
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-[#2A2A2A] bg-[#141414]">
                            <button
                                onClick={() => {
                                    if (onAddFood) {
                                        selectedItems.forEach(item => {
                                            onAddFood(
                                                item.food,
                                                item.quantity,
                                                item.unit,
                                                (item.food as any).is_custom,
                                                (item.food as any).is_recipe
                                            );
                                        });
                                    }
                                    onClose();
                                }}
                                className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-colors"
                            >
                                Confirm & Log {selectedItems.length} Items
                            </button>
                        </div>
                    </div>
                )}

                {/* Tabs - Only Search and Recents */}
                <div className="shrink-0 border-t border-[#2A2A2A] bg-[#141414] px-4 pb-safe-mobile grid grid-cols-2 gap-2">
                    <button onClick={() => { setActiveTab('search'); setSearchView('categories'); }} className={`flex flex-col items-center justify-center py-2.5 sm:py-3 rounded-lg transition-colors ${activeTab === 'search' ? 'text-[#3B82F6] bg-[#1A1A1A]' : 'text-[#6B6B6B] hover:bg-[#1A1A1A]'
                        }`}>
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-xs sm:text-sm font-medium">Search</span>
                    </button>
                    <button onClick={() => setActiveTab('recents')} className={`flex flex-col items-center justify-center py-2.5 sm:py-3 rounded-lg transition-colors ${activeTab === 'recents' ? 'text-[#3B82F6] bg-[#1A1A1A]' : 'text-[#6B6B6B] hover:bg-[#1A1A1A]'
                        }`}>
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs sm:text-sm font-medium">Recent</span>
                    </button>
                </div>

            </div>
        </div>
    );
}
