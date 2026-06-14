import { NextResponse } from 'next/server';
import { generateAIResponse, FREE_MODELS } from '@/lib/openrouter';
import { checkAdminAuth } from '@/lib/auth';

export async function POST(request: Request) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { post } = body;

        if (!post) {
            return NextResponse.json({ success: false, error: 'Post data required' }, { status: 400 });
        }

        const prompt = `
        You are an expert freelancer crafting a cold outreach message on Reddit.
        
        Context:
        - Post Title: "${post.title}"
        - Post Author: "${post.author}"
        - Post Content: "${post.text}"
        
        Task:
        Draft a friendly, professional, and high-converting Direct Message (DM) to this user.
        
        Guidelines:
        - Subject Line: Short, relevant, and catchy (e.g., "Saw your post about X").
        - Greeting: "Hi ${post.author},"
        - Opening: Mention specifically what caught your eye in their post.
        - Value Prop: Briefly explain why we are the best fit (Agency: Levitate Labs).
        - CTA: Soft call to action (e.g., "Open to a quick chat?", "Can I send my portfolio?").
        - Tone: Conversational, not spammy. No fluff.
        - Output Format: JSON with "subject" and "message" fields.
        `;

        console.log('Generating AI Draft for:', post.author);

        const aiResponse = await generateAIResponse([
            { role: 'system', content: 'You are a professional outreach assistant. Always output valid JSON.' },
            { role: 'user', content: prompt }
        ], FREE_MODELS.GEMINI_FLASH_2);

        if (!aiResponse || aiResponse.includes('Failed to generate response')) {
            throw new Error(aiResponse || 'Failed to generate AI response');
        }

        let draft;
        try {
            // Extract JSON from markdown code block if present
            let jsonStr = aiResponse;
            if (aiResponse.includes('```json')) {
                jsonStr = aiResponse.split('```json')[1].split('```')[0].trim();
            } else if (aiResponse.includes('```')) {
                jsonStr = aiResponse.split('```')[1].split('```')[0].trim();
            }
            // Attempt to find JSON object if mixed with text
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            draft = JSON.parse(jsonStr);

            if (!draft.subject || !draft.message) {
                // Handle cases where AI uses different keys
                draft.subject = draft.subject || "Regarding your post";
                draft.message = draft.message || draft.content || draft.text || "Hi!";
            }
        } catch (e) {
            console.error('Failed to parse AI response:', aiResponse);
            throw new Error('Failed to parse AI response');
        }

        return NextResponse.json({
            success: true,
            subject: draft.subject,
            draft: draft.message
        });

    } catch (error: any) {
        console.error('AI Draft Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Unknown Server Error' }, { status: 500 });
    }
}
