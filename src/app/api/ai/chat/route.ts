import { NextResponse } from 'next/server';
import { generateAIResponse, FREE_MODELS } from '@/lib/openrouter';

const SYSTEM_PROMPT = `You are the AI assistant for Levitate Labs, a premium digital agency.

SERVICES:
- Web Development: ₹3k-25k (websites, apps, e-commerce)
- CAD/Mechanical: 3D modeling, prototyping
- Marketing: SEO, social media, lead gen
- Creative: Branding, UI/UX, video

RULES:
- Keep responses under 40 words maximum
- No emojis ever
- Be professional and direct
- For detailed inquiries: suggest WhatsApp (+91 6299549112)
- Never say "I don't know" - redirect to contact

If unsure, say: "Contact our team for specifics."`;

export async function POST(request: Request) {
    try {
        const { messages } = await request.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ success: false, error: 'Messages array required' }, { status: 400 });
        }

        // Prepend system prompt
        const fullMessages = [
            { role: 'system' as const, content: SYSTEM_PROMPT },
            ...messages.map((m: any) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            }))
        ];

        const response = await generateAIResponse(fullMessages, FREE_MODELS.MOLMO_8B);

        return NextResponse.json({ success: true, message: response });

    } catch (error: any) {
        console.error('AI Chat Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
