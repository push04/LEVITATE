
export const FREE_MODELS = {
    MOLMO_8B: 'allenai/molmo-2-8b:free',
    MIMO_FLASH: 'xiaomi/mimo-v2-flash:free',
    NEMOTRON_30B: 'nvidia/nemotron-3-nano-30b-a3b:free',
    DEVSTRAL: 'mistralai/devstral-2512:free',
    RIVERFLOW: 'sourceful/riverflow-v2-max-preview',
    TRINITY: 'arcee-ai/trinity-mini:free',
    NEMOTRON_12B_VL: 'nvidia/nemotron-nano-12b-v2-vl:free',
};

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export async function generateAIResponse(
    messages: ChatMessage[],
    model: string = FREE_MODELS.MOLMO_8B
): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.warn('OpenRouter API Key not found');
        return 'AI Configuration Error: Missing API Key';
    }

    // Order of fallback
    const modelsToTry = [
        model, // Primary choice
        FREE_MODELS.MIMO_FLASH,
        FREE_MODELS.NEMOTRON_30B,
        FREE_MODELS.DEVSTRAL,
        FREE_MODELS.RIVERFLOW,
        FREE_MODELS.TRINITY,
        FREE_MODELS.NEMOTRON_12B_VL
    ];

    // Deduplicate in case 'model' argument is one of the fallbacks
    const uniqueModels = [...new Set(modelsToTry)];

    for (const currentModel of uniqueModels) {
        try {
            console.log(`Attempting AI with Model: ${currentModel}`);

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://levitatelabs.com',
                    'X-Title': 'Levitate Labs',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: currentModel,
                    messages: messages,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`Model ${currentModel} failed: ${response.status} - ${errorText}`);
                continue; // Try next model
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;

            if (content) return content;

        } catch (error) {
            console.error(`AI Generation Error with ${currentModel}:`, error);
            // Continue to next model
        }
    }

    return 'Failed to generate AI response from all available models.';
}
