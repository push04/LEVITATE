import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse, SYSTEM_PROMPTS, FREE_MODELS, ChatMessage } from '@/lib/openrouter';

export async function POST(request: NextRequest) {
    try {
        const { message } = await request.json();

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Message is required' },
                { status: 400 }
            );
        }

        const messages: ChatMessage[] = [
            { role: 'system', content: SYSTEM_PROMPTS.VISITOR_ASSISTANT },
            { role: 'user', content: message },
        ];

        const response = await generateAIResponse(messages, FREE_MODELS.NEMOTRON);

        if (response.success) {
            return NextResponse.json({
                success: true,
                message: response.message,
            });
        } else {
            return NextResponse.json({
                success: false,
                error: response.error || 'Failed to generate response',
            });
        }
    } catch (error) {
        console.error('AI chat error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
