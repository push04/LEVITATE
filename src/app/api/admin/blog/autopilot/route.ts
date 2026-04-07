import { NextResponse } from 'next/server';
import { generateAIResponse, FREE_MODELS } from '@/lib/openrouter';
import { getServiceSupabase } from '@/lib/supabase';

const FIELDS = [
    'Artificial Intelligence & Agents',
    'Advanced Robotics & Automation',
    'Mechanical Engineering & Manufacturing',
    'Sustainable Energy & Green Tech',
    'Space Exploration & Aerospace',
    'WebAssembly & Edge Computing',
    'Biotechnology & MedTech',
    'Quantum Computing',
    'Cybersecurity & Privacy',
    'Electric Vehicles & Battery Tech'
];

const CRON_SECRET = process.env.CRON_SECRET || 'levitate_auto_secure_key_2026';

export async function GET(request: Request) {
    return handleRequest(request);
}

export async function POST(request: Request) {
    return handleRequest(request);
}

async function handleRequest(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        // Simple Cron Auth
        if (key !== CRON_SECRET) {
            // If internal (from browser dashboard), we might use session, but for now let's just use the key or session.
            // Since this is "autopilot" intended for cron, let's enforce key or session.
            // For simplicity in this context, let's assume dashboard sends POST and Cron sends GET/POST with key.
            const supabase = getServiceSupabase();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session && key !== CRON_SECRET) {
                return NextResponse.json({ error: 'Unauthorized. Use ?key=levitate_auto_secure_key_2026 for cron.' }, { status: 401 });
            }
        }

        const force = searchParams.get('force'); // Optional param to force post even if recently posted

        // LOGIC: 30% Chance for "Service Spotlight" (Promotional), 70% Chance for "Tech News" (Informational)
        const isServiceSpotlight = Math.random() < 0.3;

        let systemPrompt = '';
        let chosenCategory = '';
        let chosenTopic = ''; // Used for fallback only

        if (isServiceSpotlight) {
            // SERVICE SPOTLIGHT MODE
            const SERVICES = [
                'Premium Web Development',
                'SEO & Digital Growth',
                'Custom Mobile App Development',
                'UI/UX Design Strategy',
                'Technical Business Consulting'
            ];
            const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
            chosenCategory = 'Levitate Services';
            chosenTopic = service;

            systemPrompt = `You are a Senior Marketing Director for Levitate Labs (a premium digital agency).
            
            Task: Write a persuasive, high-value blog post highlighting our service: **${service}**.
            
            Content Guidelines:
            - **Goal**: Educate the reader on WHY they need this service and HOW it solves their business problems.
            - **Tone**: Authoritative, Professional, Results-Driven. "Simple, Human English".
            - **Structure**:
                - Hook: The problem businesses face.
                - The Solution: How ${service} fixes it.
                - The Levitate Difference: Why premium quality matters.
                - Call to Action: Soft sell to contact us.
            - **Formatting**: Use <h2>, <p>, <ul>, <li>, <strong>. HTML only. NO Markdown.
            - **Length**: ~500 words.
            - **Prohibited**: Do NOT use emojis. NO long dashes.
            
            RETURN JSON ONLY:
            { "title": "Catchy Title", "content": "HTML...", "excerpt": "...", "category": "Levitate Services" }`;

        } else {
            // TECH NEWS MODE (Default)
            // Randomly pick a field to focus on
            const field = FIELDS[Math.floor(Math.random() * FIELDS.length)];
            chosenCategory = field;
            chosenTopic = `Latest News in ${field}`;

            systemPrompt = `You are a futuristic tech journalist for Levitate Labs (Year: 2026).
            
            Task:
            1. IDENTIFY a specific, realistic "latest development", "breakthrough", or "emerging trend" in the field of: **${field}**.
            2. Write a captivating, news-style blog post about it.
            
            Content Guidelines:
            - **Focus**: New Research, Engineering Marvels, Software Breakthroughs, or Industry Shifts.
            - **Style**: Professional, Informative, Exciting. "Simple, Human English".
            - **Structure**:
                - Catchy Headline (not clickbait, but interesting).
                - Introduction (The "What" and "Why").
                - The Tech Details (How it works, simply explained).
                - Impact (Why it matters for the future).
            - **Formatting**: Use <h2>, <p>, <ul>, <li>, <strong>. HTML only. NO Markdown.
            - **Length**: ~500-600 words.
            - **Prohibited**: Do NOT use emojis. NO long dashes.

            RETURN JSON ONLY:
            { "title": "Title Here", "content": "HTML Content Here", "excerpt": "Short 2 sentence summary...", "category": "${field}" }`;
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Generate content now.' }
        ];

        // @ts-ignore
        let aiResponse = await generateAIResponse(messages, FREE_MODELS.GEMINI_FLASH_2);
        aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();

        let parsed;
        try {
            parsed = JSON.parse(aiResponse);
        } catch (e) {
            // Fallback using the chosenTopic we saved earlier
            parsed = { title: chosenTopic, content: aiResponse, excerpt: "Insights on " + chosenTopic };
        }

        // Publish to Supabase
        const supabase = getServiceSupabase();
        // Use parsed title for slug
        const slug = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

        const { data, error } = await supabase.from('posts').insert([{
            title: parsed.title,
            slug: slug,
            category: parsed.category || chosenCategory,
            content: parsed.content,
            excerpt: parsed.excerpt || parsed.content.substring(0, 150) + '...',
            cover_image: '/blog/default.jpg', // Could enhance to select image based on field later
            read_time: '5 min read',
            published: true,
            created_at: new Date().toISOString()
        }]).select().single();

        if (error) throw error;

        return NextResponse.json({ success: true, post: data, mode: isServiceSpotlight ? 'Service Spotlight' : 'Tech News' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
