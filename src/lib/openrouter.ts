import { generateGoogleAI } from './google-ai';

export const FREE_MODELS = {
    // High Reliability Free Models
    GEMINI_FLASH_2: 'google/gemini-2.0-flash-exp:free',
    GEMINI_FLASH_THINKING: 'google/gemini-2.0-flash-thinking-exp:free',
    GEMINI_FLASH_1_5: 'google/gemini-flash-1.5-8b',
    LLAMA_3_8B: 'meta-llama/llama-3-8b-instruct:free',
    MOLMO_8B: 'allenai/molmo-2-8b:free',

    // Fallbacks (Verified Free)
    MIMO_FLASH: 'xiaomi/mimo-v2-flash:free',
    NEMOTRON_30B: 'nvidia/nemotron-3-nano-30b-a3b:free',
    TRINITY: 'arcee-ai/trinity-mini:free',
};

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export async function generateAIResponse(
    messages: ChatMessage[],
    model: string = FREE_MODELS.GEMINI_FLASH_2
): Promise<string> {

    // 1. Try Google Direct First (High Limits)
    // This bypasses OpenRouter entirely if a GOOGLE_API_KEY is present
    const googleResponse = await generateGoogleAI(messages);
    if (googleResponse) {
        return googleResponse;
    }

    // 2. Fallback to OpenRouter
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        // If we don't have OpenRouter either, we are stuck.
        console.warn('OpenRouter API Key not found');
        return 'AI Configuration Error: Missing API Keys (Google and OpenRouter)';
    }

    // Strict Free Model Fallback Order
    const modelsToTry = [
        model,
        FREE_MODELS.GEMINI_FLASH_2,
        FREE_MODELS.GEMINI_FLASH_THINKING,
        FREE_MODELS.LLAMA_3_8B,
        FREE_MODELS.GEMINI_FLASH_1_5,
        FREE_MODELS.MIMO_FLASH,
        FREE_MODELS.NEMOTRON_30B
    ];

    // Deduplicate 
    const uniqueModels = [...new Set(modelsToTry)];
    let lastError = '';

    for (const currentModel of uniqueModels) {
        try {
            console.log(`Attempting AI with Model (OpenRouter): ${currentModel}`);

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://levitatelabs.online',
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
                if (response.status === 402 || response.status === 429) {
                    lastError = `Model ${currentModel} failed (Limit/Payment): ${response.status}`;
                    console.warn(lastError);
                } else {
                    lastError = `Model ${currentModel} failed: ${response.status} - ${errorText}`;
                    console.warn(lastError);
                }
                continue;
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;

            if (content) return content;

        } catch (error: any) {
            lastError = `AI Generation Error with ${currentModel}: ${error.message}`;
            console.error(lastError, error);
        }
    }

    return `Failed to generate response. Last Error: ${lastError}. \n\nPRO TIP: Add GOOGLE_API_KEY to .env.local to bypass these limits!`;
}
