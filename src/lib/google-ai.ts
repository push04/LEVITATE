
const GENERATIVE_AI_KEY = process.env.GOOGLE_API_KEY;

// List of models to try in order
const GOOGLE_MODELS = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.0-pro'
];

export async function generateGoogleAI(messages: { role: string; content: string }[]): Promise<string | null> {
    if (!GENERATIVE_AI_KEY) return null;

    // Convert messages for Gemini API
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const contents = chatMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
    }));

    const systemInstruction = systemMessage ? {
        parts: [{ text: systemMessage.content }]
    } : undefined;

    // Try models in order
    for (const model of GOOGLE_MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GENERATIVE_AI_KEY}`;
            // console.log(`Attempting Google AI with model: ${model}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    systemInstruction,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    }
                })
            });

            if (!response.ok) {
                const err = await response.text();
                console.warn(`[Google AI] Model ${model} failed: ${response.status} - ${err}`);
                continue; // Try next model
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return text;

        } catch (error) {
            console.error(`[Google AI] Model ${model} error:`, error);
        }
    }

    return null;
}
