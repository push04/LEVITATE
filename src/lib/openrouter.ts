
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
    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            console.warn('OpenRouter API Key not found');
            return 'AI Configuration Error: Missing API Key';
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://levitatelabs.com', // Replace with your actual site URL
                'X-Title': 'Levitate Labs',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response from AI';
    } catch (error) {
        console.error('AI Generation Failed:', error);
        return 'Failed to generate AI response. Please try again later.';
    }
}
