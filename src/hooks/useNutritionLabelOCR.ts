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
    fiber?: number;
    saturated_fat?: number;
    sodium?: number;
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
                            content: `You are a nutrition label parser. Extract nutrition facts from the image and return ONLY valid JSON with these fields (use null for missing values):
{
  "name": "product name if visible",
  "brand": "brand name if visible", 
  "serving_size_g": number in grams,
  "calories": number,
  "protein": number in grams,
  "carbs": number in grams (total carbohydrates),
  "fat": number in grams (total fat),
  "sugar": number in grams,
  "fiber": number in grams,
  "saturated_fat": number in grams,
  "sodium": number in milligrams,
  "ingredients": "full ingredients list as text"
}
Return ONLY the JSON object, no markdown or explanation.`
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
