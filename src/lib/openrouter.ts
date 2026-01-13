// OpenRouter AI Client for Levitate Labs
// Using free models as specified

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIResponse {
    success: boolean;
    message: string;
    error?: string;
}

// Free models available
export const FREE_MODELS = {
    NEMOTRON: 'nvidia/nemotron-3-nano-30b-a3b:free',
    MIMO: 'xiaomi/mimo-v2-flash:free',
} as const;

export async function generateAIResponse(
    messages: ChatMessage[],
    model: string = FREE_MODELS.NEMOTRON
): Promise<AIResponse> {
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://levitatelabs.com',
                'X-Title': 'Levitate Labs',
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: 1000,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenRouter API error: ${error}`);
        }

        const data = await response.json();
        return {
            success: true,
            message: data.choices[0]?.message?.content || 'No response generated',
        };
    } catch (error) {
        console.error('AI generation error:', error);
        return {
            success: false,
            message: '',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

// System prompts for different AI features
export const SYSTEM_PROMPTS = {
    VISITOR_ASSISTANT: `You are the AI assistant for Levitate Labs, a multidisciplinary agency offering:
- Web Development (Static sites, Full Stack Apps, CMS, E-commerce, SaaS MVPs)
- Mechanical Engineering (2D Drafting, 3D Modeling, Rendering, FEA Simulation)
- Growth Marketing (Tech SEO, Automation, Ads, Social Media Management)
- Creative Services (Graphic Design, Logo/Identity, Copywriting, Pitch Decks, Video Editing)

Be helpful, professional, and guide visitors towards understanding our services. 
Keep responses concise and friendly. If they seem interested, encourage them to use our contact form.
FORMATTING: Do not use long dashes (—). Use standard hyphens (-) or colons (:).`,

    LEAD_ANALYZER: `You are an AI assistant helping analyze incoming leads for Levitate Labs.
Evaluate the lead based on:
- Service fit: Does their request match our offerings?
- Budget alignment: Is their budget realistic for their needs?
- Urgency: Do they seem ready to proceed?
- Quality: Is this a serious inquiry or spam?

Provide a brief analysis with a quality score (1-10) and recommended next steps.`,
};
