import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { DayLog, Meal, FoodEntry, MealType } from '../types';
import { useAuthStore } from '../stores/authStore';

export function useNutrition(date: string) {
    const { session } = useAuthStore();
    const queryClient = useQueryClient();
    const userId = session?.user?.id;

    // Fetch Day Log with Meals and Entries
    const dayLogQuery = useQuery({
        queryKey: ['dayLog', userId, date],
        queryFn: async () => {
            if (!userId) return null;

            // 1. Get or Create Day Log
            let { data: dayLog, error } = await supabase
                .from('day_logs')
                .select('*')
                .eq('user_id', userId)
                .eq('date', date)
                .maybeSingle();

            if (!dayLog && !error) {
                // Create new day log if not exists
                const { data: newLog, error: createError } = await supabase
                    .from('day_logs')
                    .insert({ user_id: userId, date })
                    .select()
                    .single();

                if (createError) {
                    // Handle race condition where it was created in between
                    if (createError.code === '23505' || (createError as any).status === 409) { // Unique violation
                        const { data: existingLog, error: retryError } = await supabase
                            .from('day_logs')
                            .select('*')
                            .eq('user_id', userId)
                            .eq('date', date)
                            .single();
                        if (retryError) throw retryError;
                        dayLog = existingLog;
                    } else {
                        throw createError;
                    }
                } else {
                    dayLog = newLog;
                }
            } else if (error) {
                throw error;
            }

            // 2. Fetch Meals & Entries (Embed ONLY custom_food with explicit FK)
            const { data: meals, error: mealsError } = await supabase
                .from('meals')
                .select(`
                    *,
                    entries:food_entries (
                        *,
                        custom_food:user_custom_foods!food_entries_custom_food_id_fkey(*),
                        recipe:recipes(
                            *,
                            ingredients:recipe_ingredients(
                                *,
                                food:food_items(*),
                                custom_food:user_custom_foods(*)
                            )
                        )
                    )
                `)
                .eq('day_log_id', dayLog.id);

            if (mealsError) throw mealsError;

            // 3. Ensure all meal types exist
            const requiredMeals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
            const existingTypes = new Set(meals?.map(m => m.meal_type));
            const missingTypes = requiredMeals.filter(t => !existingTypes.has(t));

            if (missingTypes.length > 0) {
                const { data: newMeals, error: createMealsError } = await supabase
                    .from('meals')
                    .insert(
                        missingTypes.map(type => ({
                            day_log_id: dayLog.id,
                            meal_type: type
                        }))
                    )
                    .select();

                if (createMealsError) throw createMealsError;
                // Add new empty meals to the list
                meals?.push(...newMeals.map(m => ({ ...m, entries: [] })));
            }

            // 4. Manually Fetch Global Foods (Schema workaround: food_id is not a FK)
            const globalFoodIds = new Set<string>();
            meals?.forEach(meal => {
                meal.entries?.forEach((entry: any) => {
                    if (entry.food_id) {
                        globalFoodIds.add(entry.food_id);
                    }
                });
            });

            const globalFoodsMap = new Map<string, any>();
            if (globalFoodIds.size > 0) {
                const { data: foods } = await supabase
                    .from('food_items')
                    .select('*')
                    .in('id', Array.from(globalFoodIds));

                foods?.forEach(f => globalFoodsMap.set(f.id, f));
            }

            // 5. Map entries to inject 'food' property
            const processedMeals = meals?.map(meal => ({
                ...meal,
                entries: meal.entries?.map((entry: any) => {
                    // Get food from manual map or embedded custom_food
                    let food = null;
                    if (entry.food_id) {
                        food = globalFoodsMap.get(entry.food_id);
                    } else if (entry.custom_food) {
                        // Handle array vs object response
                        const cf = Array.isArray(entry.custom_food) ? entry.custom_food[0] : entry.custom_food;
                        food = cf;
                    }

                    return {
                        ...entry,
                        food, // Normalize to 'food' for UI
                    };
                })
            }));

            return { ...dayLog, meals: processedMeals } as DayLog;
        },
        enabled: !!userId,
    });

    // Add Food Entry
    const addEntryMutation = useMutation({
        mutationFn: async ({
            mealId,
            foodId,
            customFoodId,
            recipeId,
            quantity,
            nutrition,
            caffeine_mg,
            water_ml,
            metric_quantity,
            metric_unit,
            logged_at,
            fiber_g,
            sugar_alcohols_g,
            net_carbs_g
        }: {
            mealId: string,
            foodId?: string,
            customFoodId?: string,
            recipeId?: string,
            quantity: number,
            nutrition: { calories: number, protein: number, carbs: number, fat: number },
            caffeine_mg?: number,
            water_ml?: number,
            metric_quantity?: number,
            metric_unit?: string,
            logged_at?: string,
            // Net Carb Snapshot Fields
            fiber_g?: number,
            sugar_alcohols_g?: number,
            net_carbs_g?: number
        }) => {
            console.log("Adding Entry:", { mealId, foodId, quantity, caffeine_mg, net_carbs_g });
            const { data, error } = await supabase
                .from('food_entries')
                .insert({
                    meal_id: mealId,
                    food_id: foodId || null,
                    custom_food_id: customFoodId || null,
                    recipe_id: recipeId || null,
                    quantity_g: quantity,
                    ...nutrition,
                    caffeine_mg,
                    water_ml,
                    metric_quantity,
                    metric_unit,
                    logged_at: logged_at || new Date().toISOString(),
                    fiber_g,
                    sugar_alcohols_g,
                    net_carbs_g
                })
                .select()
                .single();

            if (error) {
                console.error("Add Entry Failed:", error);
                throw error;
            }
            console.log("Entry Added Successfully:", data);

            // Add to Persistent History (Recents) - Only for atomic foods
            if (userId && (foodId || customFoodId) && !recipeId) {
                const historyPayload = {
                    user_id: userId,
                    food_id: foodId || null,
                    custom_food_id: customFoodId || null,
                    last_used_at: new Date().toISOString()
                };

                // Determine conflict target based on which ID is present
                const conflictTarget = foodId ? 'user_id, food_id' : 'user_id, custom_food_id';

                const { error: historyError } = await supabase
                    .from('user_food_history')
                    .upsert(historyPayload, { onConflict: conflictTarget, ignoreDuplicates: false });

                if (historyError) {
                    console.error("Failed to update food history:", historyError);
                    // Non-blocking error
                }
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dayLog', userId, date] });
            // Invalidate recents to show new entry immediately
            queryClient.invalidateQueries({ queryKey: ['recentFoods'] });
        },
    });

    // Update Entry
    const updateEntryMutation = useMutation({
        mutationFn: async ({
            entryId,
            quantity,
            nutrition,
            logged_at,
            metric_quantity,
            metric_unit,
            fiber_g,
            sugar_alcohols_g,
            net_carbs_g
        }: {
            entryId: string,
            quantity: number,
            nutrition: { calories: number; protein: number; carbs: number; fat: number },
            logged_at?: string,
            metric_quantity?: number,
            metric_unit?: string,
            // Check if we need to update snapshots on edit?
            // Usually editing quantity implies recalc. For now, UI might not pass these yet.
            // If we want FULL support, we should accept them here too.
            fiber_g?: number,
            sugar_alcohols_g?: number,
            net_carbs_g?: number
        }) => {
            const updates: any = {
                quantity_g: quantity,
                ...nutrition
            };
            if (logged_at) updates.logged_at = logged_at;
            if (metric_quantity !== undefined) updates.metric_quantity = metric_quantity;
            if (metric_unit !== undefined) updates.metric_unit = metric_unit;
            if (fiber_g !== undefined) updates.fiber_g = fiber_g;
            if (sugar_alcohols_g !== undefined) updates.sugar_alcohols_g = sugar_alcohols_g;
            if (net_carbs_g !== undefined) updates.net_carbs_g = net_carbs_g;

            const { error } = await supabase
                .from('food_entries')
                .update(updates)
                .eq('id', entryId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dayLog', userId, date] });
        },
    });

    // Delete Entry
    const deleteEntryMutation = useMutation({
        mutationFn: async (entryId: string) => {
            const { error } = await supabase
                .from('food_entries')
                .delete()
                .eq('id', entryId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dayLog', userId, date] });
        },
    });

    // Move Entry
    const moveEntryMutation = useMutation({
        mutationFn: async ({ entryIds, targetMealId }: { entryIds: string[], targetMealId: string }) => {
            const { error } = await supabase
                .from('food_entries')
                .update({ meal_id: targetMealId })
                .in('id', entryIds);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dayLog', userId, date] });
        },
    });

    return {
        dayLog: dayLogQuery.data,
        isLoading: dayLogQuery.isLoading,
        addEntry: addEntryMutation.mutate,
        updateEntry: updateEntryMutation.mutate,
        deleteEntry: deleteEntryMutation.mutate,
        moveEntry: moveEntryMutation.mutate,
    };
}
