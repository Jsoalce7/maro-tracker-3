import { useState } from 'react';

interface ParsedNutritionData {
    name?: string;
    brand?: string;
    serving_size_g?: number;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    sugar?: number;
    added_sugar?: number;
    fiber?: number;
    saturated_fat?: number;
    trans_fat?: number;
    cholesterol?: number;
    sodium?: number;
    potassium?: number;
    calcium?: number;
    iron?: number;
    vitamin_d?: number;
    ingredients?: string;
}

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export function useNutritionLabelOCR() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parseLabel = async (imageBase64: string): Promise<ParsedNutritionData | null> => {
        setIsLoading(true);
        setError(null);

        if (!OPENAI_API_KEY) {
            setError('OpenAI API key not configured. Add VITE_OPENAI_API_KEY to .env');
            setIsLoading(false);
            return null;
        }

        try {
            console.log('[OCR] Calling OpenAI Vision API...');

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a nutrition label parser optimized for US FDA labels. Extract nutrition facts and return ONLY valid JSON.
Missing values MUST be null, do not infer them.

Fields to extract:
- "name": Product name (if visible)
- "brand": Brand name (if visible)
- "serving_size_g": Serving size in GRAMS (number).
- "calories": Calorie count (number)
- "protein": Protein in grams (number)
- "carbs": Total Carbohydrate in grams (number). MATCH "Total Carbohydrate".
- "fat": Total Fat in grams (number). MATCH "Total Fat".
- "sugar": Total Sugars in grams (number). MATCH "Total Sugars".
- "added_sugar": Added Sugars in grams (number). MATCH "Includes Xg Added Sugars".
- "fiber": Dietary Fiber in grams (number). MATCH "Dietary Fiber".
- "saturated_fat": Saturated Fat in grams (number).
- "trans_fat": Trans Fat in grams (number).
- "cholesterol": Cholesterol in milligrams (mg).
- "sodium": Sodium in LEVEL MILLIGRAMS (mg).
- "potassium": Potassium in milligrams (mg).
- "calcium": Calcium in milligrams (mg).
- "iron": Iron in milligrams (mg).
- "vitamin_d": Vitamin D in micrograms (mcg).
- "ingredients": Full ingredient text.

IMPORTANT:
- If "Dietary Fiber" is not explicitly written, set "fiber": null.
- If "Total Sugars" is not explicitly written, set "sugar": null.
- If "Includes Xg Added Sugars" is not explicitly written, set "added_sugar": null.
- For Trans Fat, Cholesterol, and Micros (Vit D, Ca, Fe, K): If not found, set to null.
- Do not guess. If the image is blurry or the value is cut off, return null.
`
                        },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: imageBase64,
                                        detail: 'high'
                                    }
                                },
                                {
                                    type: 'text',
                                    text: 'Extract all nutrition information from this label. Return JSON only.'
                                }
                            ]
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.1,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[OCR] OpenAI API error:', errorText);
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error('No response from OpenAI');
            }

            // Parse the JSON response
            let nutritionData: ParsedNutritionData;
            try {
                const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
                nutritionData = JSON.parse(jsonStr);
            } catch {
                console.error('[OCR] Failed to parse response:', content);
                throw new Error('Failed to parse nutrition data');
            }

            console.log('[OCR] Parsed data:', nutritionData);
            return nutritionData;

        } catch (err) {
            console.error('[OCR] Error:', err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return { parseLabel, isLoading, error };
}
