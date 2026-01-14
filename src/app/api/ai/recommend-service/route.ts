import { NextResponse } from 'next/server';
import { generateAIResponse, FREE_MODELS } from '@/lib/openrouter';

const SERVICES_DATA = `
SERVICES AVAILABLE:
1. Web Development (₹3,000-25,000): Custom websites, landing pages, CMS integration, e-commerce
2. Mechanical Engineering: 3D CAD modeling, prototyping, technical drawings
3. Growth Marketing: SEO, social media, lead generation, analytics
4. Creative Services: Branding, UI/UX design, video editing, graphic design
`;

export async function POST(request: Request) {
    try {
        const { userNeeds } = await request.json();

        if (!userNeeds) {
            return NextResponse.json({ success: false, error: 'User needs description required' }, { status: 400 });
        }

        const prompt = `You are a service recommendation assistant for Levitate Labs.

${SERVICES_DATA}

User's needs: "${userNeeds}"

Based on the user's description, recommend the BEST matching service(s).

Output JSON only:
{
  "primary": {
    "name": "Service Name",
    "reason": "Why this is the best fit (1 sentence)",
    "slug": "web|mechanical|growth|creative"
  },
  "secondary": {
    "name": "Alternative Service",
    "reason": "Why this might also help",
    "slug": "web|mechanical|growth|creative"
  } or null
}`;

        const response = await generateAIResponse([
            { role: 'system', content: 'You are a helpful service recommender. Output valid JSON only.' },
            { role: 'user', content: prompt }
        ], FREE_MODELS.MOLMO_8B);

        // Parse JSON
        let result;
        try {
            const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
            result = JSON.parse(cleanJson);
        } catch (e) {
            // Fallback
            result = {
                primary: { name: 'Web Development', reason: 'Most popular service for business growth', slug: 'web' },
                secondary: null
            };
        }

        return NextResponse.json({ success: true, recommendation: result });

    } catch (error: any) {
        console.error('Recommend Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
