import { NextResponse } from 'next/server';
import { generateAIResponse, FREE_MODELS } from '@/lib/openrouter';

const SYSTEM_PROMPT = `You are the AI assistant for Levitate Labs, a premium digital agency. You help visitors learn about services, pricing, and guide them to the right solutions.

**About Levitate Labs:**
- Web Development: Custom websites, CMS integration, e-commerce (₹3,000 - ₹25,000)
- Mechanical/CAD Design: 3D modeling, prototyping, engineering drawings
- Growth & Marketing: SEO, social media, lead generation
- Creative Services: Branding, UI/UX design, video editing

**Key Info:**
- Based in India
- WhatsApp: +91 6299549112
- Fast turnaround (typically 3-10 business days)

**Your Behavior:**
- Be helpful, concise, and professional
- Recommend specific services based on user needs
- If they seem ready to buy, suggest contacting via WhatsApp or the contact form
- Keep responses under 100 words unless they ask for details
- Use emojis sparingly for friendliness 🚀

If you don't know something specific, guide them to contact the team directly.`;

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
