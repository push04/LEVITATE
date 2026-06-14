import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { generateAIResponse, FREE_MODELS } from '@/lib/openrouter';

export async function POST(request: Request) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { topic, category } = await request.json();

        if (!topic) {
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
        }

        const systemPrompt = `You are an expert content writer for a digital agency called Levitate Labs. 
        Write a professional, SEO-optimized blog post about "${topic}" in the category of "${category}".
        
        RETURN A JSON OBJECT ONLY. DO NOT WRAP IN MARKDOWN CODE BLOCKS.
        Format:
        {
            "title": "A Catchy, Click-worthy Title",
            "content": "The full blog post content in semantic HTML"
        }

        Content Guidelines:
        - Approx 400-600 words.
        - Use <h2>, <h3>, <p>, <ul>, <li>, <strong>tags.
        - Write in SIMPLE, HUMAN, CONVERSATIONAL English. (Grade 8 reading level).
        - DO NOT use long em-dashes (—). Use normal punctuation.
        - Focus on delivering value quickly.
        - Style specific elements:
            - Wrap key insights in <div class="bg-[var(--secondary)] p-4 rounded-xl border-l-4 border-[var(--primary)] my-6">...</div>
            - Use beautiful unordered lists.
        - Tone: Professional, authoritative, yet accessible.
        - NO Markdown. ONLY HTML inside the content string.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Write the blog post about ${topic}` }
        ];

        // @ts-ignore
        let aiResponse = await generateAIResponse(messages, FREE_MODELS.GEMINI_FLASH_2);

        // Clean up if wrapped in backticks
        aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(aiResponse);
        } catch (e) {
            // Fallback if parsing fails - assume it's just content
            parsedResponse = { title: topic, content: aiResponse };
        }

        return NextResponse.json({
            title: parsedResponse.title,
            content: parsedResponse.content
        });

    } catch (error: unknown) {
        console.error('Blog Generation Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
    }
}
