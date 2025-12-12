import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { FoodItem } from '../types';
import { useAuthStore } from '../stores/authStore';

export function useFood() {
    const { session } = useAuthStore();
    const queryClient = useQueryClient();
    const userId = session?.user?.id;

    // Search Foods
    const searchFoods = async (query: string, categoryFilter?: string, subCategoryFilter?: string, ingredientTypeFilter?: string) => {
        // Allow browsing categories without search query
        if (!query && (!categoryFilter || categoryFilter === 'All')) return [];
        // If searching, require at least 2 characters unless category is selected
        if (query && query.length < 2 && (!categoryFilter || categoryFilter === 'All')) return [];

        let globalQuery = supabase.from('food_items').select('*');
        let customQuery = userId ? supabase.from('user_custom_foods').select('*').eq('user_id', userId) : null;
        let recipeQuery = userId ? supabase.from('recipes').select('*').eq('user_id', userId) : null;

        // Apply Text Search
        if (query && query.length >= 2) {
            const searchOr = `name.ilike.%${query}%,brand.ilike.%${query}%,restaurant.ilike.%${query}%`;
            globalQuery = globalQuery.or(searchOr);
            if (customQuery) customQuery = customQuery.or(searchOr);
            if (recipeQuery) recipeQuery = recipeQuery.ilike('name', `%${query}%`); // Recipes mainly match name
        }

        // Apply Category/Tag Filter if provided
        if (categoryFilter && categoryFilter !== 'All') {
            globalQuery = globalQuery.or(`category.eq.${categoryFilter},tags.cs.{${categoryFilter}}`);
            if (customQuery) customQuery = customQuery.or(`category.eq.${categoryFilter},tags.cs.{${categoryFilter}}`);
            if (recipeQuery) recipeQuery = recipeQuery.or(`category.eq.${categoryFilter},tags.cs.{${categoryFilter}}`);
        }

        // Apply Ingredient Type Filter (Level 2)
        if (ingredientTypeFilter) {
            // Strict AND filtering for ingredient_type
            globalQuery = globalQuery.eq('ingredient_type', ingredientTypeFilter);
            if (customQuery) customQuery = customQuery.eq('ingredient_type', ingredientTypeFilter);
            // Recipes don't support ingredient_type, so if we are strictly filtering by it, recipes should probably be excluded 
            // OR we assume recipes don't match this filter. 
            // For now, if searching Ingredients, recipes are usually not relevant unless 'My Meal' can be an ingredient? 
            // If user makes a 'Sauce' recipe, they might want to use it as an ingredient.
            // But recipes don't have 'ingredient_type' column usually.
            // If we filter by ingredient_type, recipes will return nothing if we try to filter on a column that doesn't exist?
            // Actually supabase will error if column doesn't exist.
            // Recipes table schema: id, user_id, name, ... category, tags ...
            // It does NOT have ingredient_type.
            // So if ingredientTypeFilter is active, we should probably set recipeQuery to return empty or null.
            recipeQuery = null;
        }

        // Apply Sub-Category Filter (Level 3 - e.g. "Bread", "Water", "Chips")
        if (subCategoryFilter) {
            // Updated Logic: Check sub_category column OR Tags
            // This ensures Drinks (tagged "Water") and Snacks (tagged "Chips") work, 
            // while Ingredients (sub_category "White Meat") also work.

            const subFilter = `sub_category.eq.${subCategoryFilter},tags.cs.{${subCategoryFilter}}`;

            globalQuery = globalQuery.or(subFilter);
            if (customQuery) customQuery = customQuery.or(subFilter);

            // For recipes, checking tags is good too if they are categorized
            if (recipeQuery !== null) {
                // If recipe query wasn't nulled by ingredientType filter
                recipeQuery = recipeQuery.or(`tags.cs.{${subCategoryFilter}},drink_type.eq.${subCategoryFilter}`); // Check drink_type too
            }
        }

        const [globalRes, customRes, recipeRes] = await Promise.all([
            globalQuery.limit(50),
            customQuery ? customQuery.limit(50) : { data: [] },
            recipeQuery ? recipeQuery.limit(50) : { data: [] }
        ]);

        const globalFoods = globalRes.data || [];
        const customFoods = customRes.data || [];
        const recipes = recipeRes.data || [];

        // Map Recipes to FoodItem shape
        const formattedRecipes = recipes.map(r => ({
            id: r.id,
            name: r.name,
            brand: 'My Meal', // distinct
            // Approximations for display. Real logging uses recipe_id.
            calories_per_100g: (r.total_calories / (r.servings_per_recipe || 1)) * 100, // Very rough assumption of 100g serving? No.
            // Better: Just show Per Serving values in specific fields if UI supports, or hack it.
            // UI shows "kcal/100g". If is_recipe, we might want to show "kcal/serving" in UI.
            // For now, let's put per-serving values in the 100g slots but mark it.
            // actually, let's just use 0 or calc if we had weight.
            // let's leave it as is, UI might look weird but it makes it searchable.
            protein_per_100g: 0,
            carbs_per_100g: 0,
            fat_per_100g: 0,
            is_custom: true,
            is_recipe: true,
            category: r.category,
            tags: r.tags,
            drink_type: r.drink_type
        }));

        const formattedCustom = customFoods.map(f => ({ ...f, is_custom: true }));
        const formattedGlobal = globalFoods.map(f => ({ ...f, is_custom: false }));

        return [...formattedRecipes, ...formattedCustom, ...formattedGlobal];
    };

    // Get Persistent Recents (from user_food_history)
    const recentFoodsQuery = useQuery({
        queryKey: ['recentFoods', userId],
        queryFn: async () => {
            if (!userId) return [];

            const { data: history, error } = await supabase
                .from('user_food_history')
                .select(`
                    food_id,
                    custom_food_id,
                    food_items(*),
                    user_custom_foods(*)
                `)
                .eq('user_id', userId)
                .order('last_used_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error("Failed to fetch recents:", error);
                return [];
            }

            // Map and flatten
            const items = history.map((item: any) => {
                if (item.food_id && item.food_items) {
                    return Array.isArray(item.food_items) ? item.food_items[0] : item.food_items;
                } else if (item.custom_food_id && item.user_custom_foods) {
                    const cf = Array.isArray(item.user_custom_foods) ? item.user_custom_foods[0] : item.user_custom_foods;
                    return { ...cf, is_custom: true };
                }
                return null;
            }).filter(Boolean) as FoodItem[];

            return items;
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    // Get All Custom Foods (Full History)
    const allCustomFoodsQuery = useQuery({
        queryKey: ['allCustomFoods', userId],
        queryFn: async () => {
            if (!userId) return [];

            const { data, error } = await supabase
                .from('user_custom_foods')
                .select('*')
                .eq('user_id', userId)
                .order('name', { ascending: true }); // Alphabetical

            if (error) throw error;

            return data.map(f => ({ ...f, is_custom: true })) as FoodItem[];
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    // ... (createCustomFoodMutation) ...

    // Delete Custom Food
    const deleteCustomFoodMutation = useMutation({
        mutationFn: async (foodId: string) => {
            // 1. Manually Cascade Delete from Recipes
            // Note: This modifies recipes that use this food!
            await supabase
                .from('recipe_ingredients')
                .delete()
                .eq('custom_food_id', foodId);

            // 2. Cascade Delete from Favorites
            await supabase
                .from('favorites')
                .delete()
                .eq('custom_food_id', foodId);

            // 3. Cascade Delete from History (Recents)
            await supabase
                .from('user_food_history')
                .delete()
                .eq('custom_food_id', foodId);

            // 4. Cascade Delete from Meal Logs (Food Entries)
            // WARNING: This removes the food from history.
            // A safer approach for history preservation would be to set custom_food_id = null,
            // but FoodEntry usually requires a food join for name/macros if not snapshotted.
            // Given typical app behavior for "Delete Custom Food", removing logs is standard to avoid ghosts.
            await supabase
                .from('food_entries')
                .delete()
                .eq('custom_food_id', foodId);

            // 5. Delete the Custom Food
            const { error } = await supabase
                .from('user_custom_foods')
                .delete()
                .eq('id', foodId)
                .eq('user_id', userId); // Security check

            if (error) throw error;
        },
        onSuccess: () => {
            // ...
            queryClient.invalidateQueries({ queryKey: ['recentFoods'] });
            queryClient.invalidateQueries({ queryKey: ['allCustomFoods'] });
            queryClient.invalidateQueries({ queryKey: ['foodSearch'] });
        },
    });

    // Create Custom Food
    const createCustomFoodMutation = useMutation({
        mutationFn: async (food: Omit<FoodItem, 'id'>) => {
            if (!userId) throw new Error('No user');

            // 0. Ensure Profile Exists (Fix for missing FK violation)
            await supabase
                .from('user_profiles')
                .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });

            // 1. Check existing by name (ignore case)
            const { data: existing, error: searchError } = await supabase
                .from('user_custom_foods')
                .select('*')
                .eq('user_id', userId)
                .ilike('name', food.name)
                .maybeSingle();

            if (searchError) throw searchError;

            if (existing) {
                // Determine if we should update it? For now, just return it.
                // The user intention is "I want this food to exist".
                return existing;
            }

            // 2. Build payload with all fields (migration has been run)
            const payload = {
                ...food,
                user_id: userId
            };

            // 3. Insert new
            const { data: newItem, error: insertError } = await supabase
                .from('user_custom_foods')
                .insert(payload)
                .select()
                .single();

            if (insertError) {
                console.error("Failed to create custom food:", insertError);
                // Double check if it was created in parallel
                const { data: retryExisting } = await supabase
                    .from('user_custom_foods')
                    .select('*')
                    .eq('user_id', userId)
                    .ilike('name', food.name)
                    .maybeSingle();

                if (retryExisting) return retryExisting;

                throw insertError;
            }

            return newItem;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recentFoods'] });
            queryClient.invalidateQueries({ queryKey: ['allCustomFoods'] });
            // also invalidate search cache so new food shows up
            queryClient.invalidateQueries({ queryKey: ['foodSearch'] });
        },
    });

    // Favorites
    const favoritesQuery = useQuery({
        queryKey: ['favorites', userId],
        queryFn: async () => {
            if (!userId) return [];

            // Allow querying all fields.
            const { data, error } = await supabase
                .from('favorites')
                .select(`
                    food_id, 
                    custom_food_id,
                    recipe_id,
                    food_items(*),
                    user_custom_foods(*),
                    recipes(*)
                `);

            if (error) throw error;

            // Map to FoodItem list
            const items = data.map((item: any) => {
                if (item.food_id && item.food_items) {
                    return Array.isArray(item.food_items) ? item.food_items[0] : item.food_items;
                } else if (item.custom_food_id && item.user_custom_foods) {
                    const cf = Array.isArray(item.user_custom_foods) ? item.user_custom_foods[0] : item.user_custom_foods;
                    return { ...cf, is_custom: true };
                } else if (item.recipe_id && item.recipes) {
                    // Map recipe to FoodItem structure for display
                    const r = Array.isArray(item.recipes) ? item.recipes[0] : item.recipes;
                    return {
                        id: r.id,
                        name: r.name,
                        brand: 'Recipe',
                        calories_per_100g: (r.total_calories / (r.servings_per_recipe || 1)) * 100,
                        protein_per_100g: (r.total_protein / (r.servings_per_recipe || 1)) * 100,
                        carbs_per_100g: (r.total_carbs / (r.servings_per_recipe || 1)) * 100,
                        fat_per_100g: (r.total_fat / (r.servings_per_recipe || 1)) * 100,
                        serving_size_g: 1, // unit is 'serving'
                        is_recipe: true,
                        category: r.category,
                        tags: r.tags
                    } as FoodItem & { is_recipe?: boolean };
                }
                return null;
            }).filter(Boolean) as FoodItem[];

            return items;
        },
        enabled: !!userId,
    });

    const toggleFavoriteMutation = useMutation({
        mutationFn: async ({ foodId, isFavorite, isCustom, isRecipe }: { foodId: string, isFavorite: boolean, isCustom?: boolean, isRecipe?: boolean }) => {
            if (!userId) throw new Error('No user');

            if (isFavorite) {
                // Remove
                let query = supabase.from('favorites').delete({ count: 'exact' }).eq('user_id', userId);

                if (isRecipe) {
                    query = query.eq('recipe_id', foodId);
                } else if (isCustom) {
                    query = query.eq('custom_food_id', foodId);
                } else {
                    query = query.eq('food_id', foodId);
                }

                const { error } = await query;
                if (error) throw error;
            } else {
                // Add
                const payload: any = { user_id: userId };
                if (isRecipe) {
                    payload.recipe_id = foodId;
                    payload.food_id = null;
                    payload.custom_food_id = null;
                } else if (isCustom) {
                    payload.custom_food_id = foodId;
                    payload.food_id = null;
                    payload.recipe_id = null;
                } else {
                    payload.food_id = foodId;
                    payload.custom_food_id = null;
                    payload.recipe_id = null;
                }

                const { error } = await supabase.from('favorites').insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
        onError: (err) => {
            console.error("Toggle favorite mutation failed:", err);
            alert("Failed to save favorite.");
        }
    });



    // Update Custom Food
    const updateCustomFoodMutation = useMutation({
        mutationFn: async ({ foodId, updates }: { foodId: string, updates: Partial<FoodItem> }) => {
            if (!userId) {
                console.error("Update Custom Food: No user ID");
                throw new Error('No user');
            }

            console.log("Updating custom food:", foodId, updates);

            // Sanitize updates to remove only IDs and system fields (keep metadata!)
            const { id, is_custom, ...fieldsToUpdate } = updates as any;

            const { error } = await supabase
                .from('user_custom_foods')
                .update(fieldsToUpdate)
                .eq('id', foodId)
                .eq('user_id', userId);

            if (error) {
                console.error("Update Custom Food Error:", error);
                throw error;
            }
            console.log("Custom food updated successfully");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recentFoods'] });
            queryClient.invalidateQueries({ queryKey: ['allCustomFoods'] });
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
            queryClient.invalidateQueries({ queryKey: ['foodSearch'] });
        },
    });

    return {
        searchFoods,
        recentFoods: recentFoodsQuery.data,
        isLoadingRecents: recentFoodsQuery.isLoading,
        allCustomFoods: allCustomFoodsQuery.data, // New
        createCustomFood: createCustomFoodMutation.mutate,
        updateCustomFood: updateCustomFoodMutation.mutate,
        favorites: favoritesQuery.data,
        toggleFavorite: toggleFavoriteMutation.mutate,
        deleteCustomFood: deleteCustomFoodMutation.mutate,
    };
}
