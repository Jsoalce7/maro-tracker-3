import { useState } from 'react';
import { FoodItem } from '../types';

interface OpenFoodFactsProduct {
    product_name?: string;
    brands?: string;
    nutriments?: {
        'energy-kcal_100g'?: number;
        points?: number; // sometimes used for legacy
        proteins_100g?: number;
        carbohydrates_100g?: number;
        fat_100g?: number;
        sugars_100g?: number;
        fiber_100g?: number;
        sodium_100g?: number;
    };
    serving_size?: string;
    code?: string;
}

export function useBarcodeLookup() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProduct = async (barcode: string): Promise<Partial<FoodItem> | null> => {
        setIsLoading(true);
        setError(null);

        try {
            console.log(`Looking up barcode: ${barcode}`);
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            if (data.status === 0 || !data.product) {
                console.log("Product not found in OpenFoodFacts");
                return { barcode }; // Return just the barcode so we can prefill it
            }

            const product = data.product as OpenFoodFactsProduct;
            const nutriments = product.nutriments;

            // Normalize data
            // Note: Serving size is a string like "30 g". We can try to parse it, but for now we default to 100g or 0 if unclear.
            // We'll leave serving_size_g as likely 100 or parsing if it's simple number-like.
            // OpenFoodFacts is primarily per 100g.

            const foodItem: Partial<FoodItem> = {
                name: product.product_name || 'Unknown Food',
                brand: product.brands || '',
                barcode: product.code || barcode,
                calories_per_100g: nutriments?.['energy-kcal_100g'] || 0,
                protein_per_100g: nutriments?.proteins_100g || 0,
                carbs_per_100g: nutriments?.carbohydrates_100g || 0,
                fat_per_100g: nutriments?.fat_100g || 0,
                // Optional
                sugar_per_100g: nutriments?.sugars_100g,
                fiber_per_100g: nutriments?.fiber_100g,
                sodium_per_100g: nutriments?.sodium_100g,
                serving_size_g: 100, // Default base
            };

            console.log("Found product:", foodItem);
            return foodItem;

        } catch (err) {
            console.error("Barcode lookup failed:", err);
            setError("Failed to fetch product data");
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return { fetchProduct, isLoading, error };
}
