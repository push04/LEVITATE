import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse, SYSTEM_PROMPTS, ChatMessage, FREE_MODELS } from '@/lib/openrouter';

export async function POST(request: NextRequest) {
    try {
        const { message } = await request.json();

        if (!message) {
            return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
        }

        const systemPrompt = `You are a helpful AI assistant for Levitate Labs. 
Your goal is to help potential clients refine their project ideas into clear, professional project descriptions.
Take their rough input and expand it into a structured summary covering:
- Core Objective
- Key Features (implied or suggested)
- Potential Tech Stack (if applicable)

Keep it concise (under 150 words) and professional. 
Do not add conversational filler.
STRICT FORMATTING RULE: NEVER use long dashes (—), em-dashes, or hyphen strings (---). 
Use standard bullet points (*) or colons (:) for separation.
Example usage: "Feature: Description" instead of "Feature — Description".`;

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Refine this project idea: "${message}"` }
        ];

        const response = await generateAIResponse(messages, FREE_MODELS.NEMOTRON);

        if (response.success) {
            // Programmatically enforce the rule
            const cleanedMessage = response.message
                .replace(/—|---|–/g, ': ') // Replace em-dashes, en-dashes, and triple dashes with colon
                .replace(/ :/g, ':');      // Fix potential double spaces

            return NextResponse.json({ success: true, refined: cleanedMessage });
        } else {
            return NextResponse.json({ success: false, error: response.error }, { status: 500 });
        }

    } catch (error) {
        console.error('AI Refine Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
