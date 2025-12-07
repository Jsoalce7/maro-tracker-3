import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NutritionData {
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

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY not configured");
        }

        const { image } = await req.json();

        if (!image) {
            throw new Error("No image provided");
        }

        console.log("Parsing nutrition label with OpenAI Vision...");

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
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
                        role: "user",
                        content: [
                            {
                                type: "image_url",
                                image_url: {
                                    url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`,
                                    detail: "high"
                                }
                            },
                            {
                                type: "text",
                                text: "Extract all nutrition information from this label. Return JSON only."
                            }
                        ]
                    }
                ],
                max_tokens: 1000,
                temperature: 0.1,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("OpenAI API error:", error);
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("No response from OpenAI");
        }

        // Parse the JSON response
        let nutritionData: NutritionData;
        try {
            // Remove any markdown code blocks if present
            const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
            nutritionData = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error("Failed to parse OpenAI response:", content);
            throw new Error("Failed to parse nutrition data from image");
        }

        console.log("Parsed nutrition data:", nutritionData);

        return new Response(
            JSON.stringify({ success: true, data: nutritionData }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );

    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            }),
            {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
