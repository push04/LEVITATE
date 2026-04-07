import { NextResponse } from 'next/server';

export const runtime = 'edge';

const SYSTEM_PROMPT = `
You are an expert executive assistant and professional communicator at **Levitate Labs**.
Your goal is to write a professional, clear, and effective email based on a short draft or subject line.

**CONTEXT:**
- Sender: "Admin / Management"
- Company: Levitate Labs (High-end digital agency)
- Tone: Professional, direct, yet "family-like" and supportive (unless it's a warning).

**INSTRUCTIONS:**
1.  **Draft the email body ONLY.** Do not include subject lines or placeholders like "[Your Name]" unless necessary (use "Admin" or "Management" if generic).
2.  **Adapt to the Template:**
    - *Standard*: Balanced, professional, friendly.
    - *Announcement*: Exciting, clear, authoritative.
    - *Warning*: Serious, direct, firm but fair.
3.  **Use the Recipient's Name** if provided.
4.  **Keep it concise.** No fluff.

**INPUT:**
- Context/Topic: {prompt}
- Template Type: {type}
- Recipient: {recipientName}
`;

export async function POST(req: Request) {
    try {
        const { prompt, type, recipientName } = await req.json();
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'OpenRouter API Key missing' }, { status: 500 });
        }

        const models = [
            'google/gemma-2-9b-it:free',
            'nvidia/nemotron-3-nano-30b-a3b:free',
            'nvidia/nemotron-nano-12b-v2-vl:free',
            'qwen/qwen3-vl-30b-a3b-thinking',
            'z-ai/glm-4.5-air:free',
            'deepseek/deepseek-r1-0528:free',
            'google/gemma-3-27b-it:free',
        ];

        let response;
        let usedModel;

        const personalizedPrompt = SYSTEM_PROMPT
            .replace('{prompt}', prompt)
            .replace('{type}', type)
            .replace('{recipientName}', recipientName || 'Team Member');

        for (const model of models) {
            try {
                response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://levitatelabs.online',
                        'X-Title': 'Levitate Labs Email Writer',
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: personalizedPrompt },
                            { role: 'user', content: `Draft an email about: "${prompt}"` }
                        ],
                        temperature: 0.7,
                    }),
                });

                if (response.ok) {
                    usedModel = model;
                    break;
                }
            } catch (err) {
                console.warn(`Model ${model} failed.`);
            }
        }

        if (!response || !response.ok) {
            return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';

        return NextResponse.json({ content });

    } catch (error) {
        console.error('AI Email Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
