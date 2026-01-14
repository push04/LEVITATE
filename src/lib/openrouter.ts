
export const FREE_MODELS = {
    GEMINI_FLASH: 'google/gemini-2.0-flash-exp:free',
    GEMINI_PRO: 'google/gemini-pro-1.5-exp',
    MISTRAL_NEMO: 'mistral/mistral-2-nemo-free',
    LLAMA_3_8B: 'meta-llama/llama-3-8b-instruct:free',
};

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export async function generateAIResponse(
    messages: ChatMessage[],
    model: string = FREE_MODELS.GEMINI_FLASH
): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.warn('OpenRouter API Key not found');
        return 'AI Configuration Error: Missing API Key';
    }

    const modelsToTry = [
        model,
        FREE_MODELS.GEMINI_PRO,
        FREE_MODELS.MISTRAL_NEMO,
        FREE_MODELS.LLAMA_3_8B
    ];

    // Deduplicate
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
