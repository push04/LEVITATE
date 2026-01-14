
import { NextResponse } from 'next/server';
import { generateAIResponse, FREE_MODELS } from '@/lib/openrouter';

export async function POST(request: Request) {
    try {
        const { lead, type } = await request.json();

        if (!lead || !type) {
            return NextResponse.json({ success: false, error: 'Lead data and type are required' }, { status: 400 });
        }

        const isEmail = type === 'email';
        const techStack = lead.raw_data?.tech_stack || 'Unknown';
        const hasWebsite = !!lead.website;
        const businessName = lead.business_name || 'Business';
        const category = lead.category || 'Business';

        let systemPrompt = '';
        let userPrompt = '';

        if (isEmail) {
            systemPrompt = `You are a world-class cold email copywriter. Write a short, punchy, high-converting B2B cold email. Keep it under 150 words. No fluff.`;
            userPrompt = `
                Write a cold email to ${businessName}, a ${category}.
                
                Context:
                - Has Website: ${hasWebsite ? 'Yes' : 'No'} (If No, sell them a website).
                - Tech Stack: ${techStack} (If Wix/WordPress, sell a faster custom site. If Unknown, sell digital transformation).
                - Rating: ${lead.rating || 'Unknown'}.
                
                Structure:
                - Subject Line: (Catchy, lower case)
                - Body: (Personalized hook, pain point based on known data, solution/offer, soft CTA).
                
                Output Format: JSON { "subject": "...", "content": "..." }
            `;
        } else {
            // CALL SCRIPT
            systemPrompt = `You are a top-tier sales development rep (SDR) trainer. Write a cold calling script that handles objections and books meetings.`;
            userPrompt = `
                Write a cold call script for ${businessName}, a ${category}.
                
                Context:
                - Website Status: ${hasWebsite ? 'Active' : 'Missing'}
                - Tech: ${techStack}
                
                Structure:
                - Opener: (Permission based or pattern interrupt)
                - The "Reason": (Why we are calling - noticed X about their business)
                - Value Prop: (How we help)
                - Common Objection Rebuttal: (e.g. "We are happy with current site")
                - Closing: (Ask for meeting)

                Output Format: JSON { "content": "..." } (Address the salesperson instructions in brackets [])
            `;
        }

        const aiResponse = await generateAIResponse([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], FREE_MODELS.GEMINI_FLASH);

        // Parse JSON
        let result;
        try {
            const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            result = JSON.parse(cleanJson);
        } catch (e) {
            // Fallback if AI doesn't return valid JSON
            result = {
                subject: isEmail ? 'Quick question about your website' : undefined,
                content: aiResponse
            };
        }

        return NextResponse.json({ success: true, data: result });

    } catch (error: any) {
        console.error('Outreach Gen Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
