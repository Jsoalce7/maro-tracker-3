import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Recipe, RecipeIngredient, FoodItem } from '../types';
import { useAuthStore } from '../stores/authStore';

export function useRecipes() {
    const { session } = useAuthStore();
    const queryClient = useQueryClient();
    const userId = session?.user?.id;

    // Fetch Recipes
    const recipesQuery = useQuery({
        queryKey: ['recipes', userId],
        queryFn: async () => {
            if (!userId) return [];

            const { data, error } = await supabase
                .from('recipes')
                .select(`
                    *,
                    ingredients:recipe_ingredients(
                        *,
                        food:food_items(*),
                        custom_food:user_custom_foods(*)
                    )
                `)
                .eq('user_id', userId)
                .order('name', { ascending: true });

            if (error) throw error;

            // Process ingredients to normalize 'food' object
            return data.map((recipe: any) => ({
                ...recipe,
                ingredients: recipe.ingredients?.map((ing: any) => ({
                    ...ing,
                    food: ing.food || ing.custom_food
                })).filter((ing: any) => !!ing.food) // Vital: Filter out ingredients where food linkage is broken (deleted food)
            })) as Recipe[];
        },
        enabled: !!userId,
    });

    // Helper to calculate totals
    const calculateRecipeTotals = async (ingredients: any[]) => {
        const foodIds = ingredients.map(i => i.food_id).filter(Boolean) as string[];
        const customFoodIds = ingredients.map(i => i.custom_food_id).filter(Boolean) as string[];

        const { data: foods } = await supabase.from('food_items').select('*').in('id', foodIds);
        const { data: customFoods } = await supabase.from('user_custom_foods').select('*').in('id', customFoodIds);

        const foodMap = new Map([...(foods || []), ...(customFoods || [])].map(f => [f.id, f]));

        let total = { calories: 0, protein: 0, carbs: 0, fat: 0 };

        ingredients.forEach(ing => {
            const food = foodMap.get(ing.food_id || ing.custom_food_id || '');
            if (food) {
                const ratio = ing.quantity / 100;
                total.calories += (food.calories_per_100g || 0) * ratio;
                total.protein += (food.protein_per_100g || 0) * ratio;
                total.carbs += (food.carbs_per_100g || 0) * ratio;
                total.fat += (food.fat_per_100g || 0) * ratio;
            }
        });
        return total;
    };

    // Create Recipe
    const createRecipeMutation = useMutation({
        mutationFn: async (newRecipe: {
            name: string,
            description?: string,
            servings_per_recipe: number,
            serving_unit?: string,
            ingredients: { food_id?: string, custom_food_id?: string, quantity: number, unit: string }[],
            // new fields
            category?: string,
            tags?: string[],
            drink_type?: string
        }) => {
            if (!userId) throw new Error('No user');

            const totals = await calculateRecipeTotals(newRecipe.ingredients);

            // Insert Recipe Header
            const { data: recipe, error: recipeError } = await supabase
                .from('recipes')
                .insert({
                    user_id: userId,
                    name: newRecipe.name,
                    description: newRecipe.description,
                    servings_per_recipe: newRecipe.servings_per_recipe,
                    serving_unit: newRecipe.serving_unit || 'serving',
                    total_calories: totals.calories,
                    total_protein: totals.protein,
                    total_carbs: totals.carbs,
                    total_fat: totals.fat,
                    // metadata
                    category: newRecipe.category || null,
                    tags: newRecipe.tags || null,
                    drink_type: newRecipe.drink_type || null
                })
                .select()
                .single();

            if (recipeError) throw recipeError;

            // Insert Ingredients
            if (newRecipe.ingredients.length > 0) {
                const ingredientsPayload = newRecipe.ingredients.map((ing, index) => ({
                    recipe_id: recipe.id,
                    food_id: ing.food_id || null,
                    custom_food_id: ing.custom_food_id || null,
                    quantity: ing.quantity,
                    unit: ing.unit,
                    display_order: index
                }));

                const { error: ingredientsError } = await supabase
                    .from('recipe_ingredients')
                    .insert(ingredientsPayload);

                if (ingredientsError) {
                    // ROLLBACK: Delete the recipe header if ingredients fail
                    console.error("Failed to insert ingredients, rolling back recipe creation...");
                    await supabase.from('recipes').delete().eq('id', recipe.id);
                    throw ingredientsError;
                }
            }

            return recipe;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipes'] });
        },
    });

    // Update Recipe
    const updateRecipeMutation = useMutation({
        mutationFn: async ({ id, updates, ingredients }: {
            id: string,
            updates: Partial<Recipe>,
            ingredients?: { food_id?: string, custom_food_id?: string, quantity: number, unit: string }[]
        }) => {
            if (!userId) throw new Error('No user');

            let totalsOverride = {};

            // If ingredients changed, recalculate totals
            if (ingredients) {
                const totals = await calculateRecipeTotals(ingredients);
                totalsOverride = {
                    total_calories: totals.calories,
                    total_protein: totals.protein,
                    total_carbs: totals.carbs,
                    total_fat: totals.fat
                };

                // Delete old ingredients
                await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);

                // Insert new ingredients
                if (ingredients.length > 0) {
                    const ingredientsPayload = ingredients.map((ing, index) => ({
                        recipe_id: id,
                        food_id: ing.food_id || null,
                        custom_food_id: ing.custom_food_id || null,
                        quantity: ing.quantity,
                        unit: ing.unit,
                        display_order: index
                    }));

                    // Sanitize: Check for duplicates in the payload itself (e.g. adding same egg twice)
                    // If table has Unique(recipe_id, food_id), we cannot add same food twice. 
                    // But users might want "2 eggs" + "1 egg". 
                    // If the schema restricts it, we must merge them or fail.
                    // Assuming schema is likely Unique(recipe_id, food_id, custom_food_id) or similar.
                    // Ideally we should merge duplicates.

                    const uniqueIngredients = ingredientsPayload.reduce((acc, current) => {
                        const key = `${current.food_id || ''}-${current.custom_food_id || ''}`;
                        const existing = acc.find(item => `${item.food_id || ''}-${item.custom_food_id || ''}` === key);
                        if (existing) {
                            existing.quantity += current.quantity; // Merge quantities
                        } else {
                            acc.push(current);
                        }
                        return acc;
                    }, [] as typeof ingredientsPayload);

                    const { error: ingError } = await supabase.from('recipe_ingredients').insert(uniqueIngredients);
                    if (ingError) throw ingError;
                }
            }

            // Update Recipe Header
            const { error } = await supabase
                .from('recipes')
                .update({ ...updates, ...totalsOverride })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipes'] });
            queryClient.invalidateQueries({ queryKey: ['favorites'] }); // Update favorites incase macros changed
        },
    });

    // Delete Recipe
    const deleteRecipeMutation = useMutation({
        mutationFn: async (recipeId: string) => {
            // 1. Manually Cascade Delete Ingredients (Safety)
            await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);

            // 2. Delete Recipe
            const { error } = await supabase.from('recipes').delete().eq('id', recipeId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipes'] });
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
    });

    return {
        recipes: recipesQuery.data,
        isLoading: recipesQuery.isLoading,
        createRecipe: createRecipeMutation.mutateAsync,
        updateRecipe: updateRecipeMutation.mutateAsync,
        deleteRecipe: deleteRecipeMutation.mutate
    };
}
