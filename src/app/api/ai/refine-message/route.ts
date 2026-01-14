import { NextResponse } from 'next/server';
import { generateAIResponse, FREE_MODELS } from '@/lib/openrouter';

export async function POST(request: Request) {
    try {
        const { message, service } = await request.json();

        if (!message) {
            return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
        }

        const prompt = `You are helping a potential client articulate their project needs for a digital agency.

The client is interested in: ${service || 'general services'}
Their rough notes: "${message}"

Rewrite their message to be:
1. Clear and professional
2. Include specific goals if implied
3. Mention any technical requirements if relevant
4. Keep it concise (under 150 words)

Output ONLY the refined message, no explanations or quotes.`;

        const response = await generateAIResponse([
            { role: 'system', content: 'You are a helpful writing assistant. Output only the refined text, nothing else.' },
            { role: 'user', content: prompt }
        ], FREE_MODELS.MOLMO_8B);

        return NextResponse.json({ success: true, refined: response });

    } catch (error: any) {
        console.error('AI Refine Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
