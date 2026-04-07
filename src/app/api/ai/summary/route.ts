import { NextResponse } from 'next/server';

export const runtime = 'edge';

const SYSTEM_PROMPT = `
You are the **Lead Recruiter at Levitate Labs**.
You have just finishing conducting a technical MCQ interview with a candidate.
Your goal is to **analyze the transcript** and provide a structured summary.

**INPUT:**
- A JSON transcript of the interview.

**OUTPUT:**
- A JSON object with the following fields:
  - "summary": A concise paragraph (3-4 sentences) evaluating the candidate's technical depth, strengths, and weaknesses based on their answers.
  - "rating": An integer from 1-10 representing their overall fit.
  - "recommendation": "HIRE", "NO HIRE", or "STRONG HIRE". Start the summary with this recommendation in bold (e.g., "**RECOMMENDATION: HIRE**").

**CRITERIA:**
- If they answered most MCQs correctly and showed depth in the "Role Selection", rate high.
- If they struggled with basic concepts, rate low.
- Be decisive.
`;

export async function POST(req: Request) {
    try {
        const { transcript } = await req.json();
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ summary: "AI Summary Unavailable (API Key Missing)", rating: 5 }, { status: 200 });
        }

        // Models to try in order
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

        for (const model of models) {
            try {
                response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://levitatelabs.online',
                        'X-Title': 'Levitate Labs Recruiter',
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: SYSTEM_PROMPT },
                            { role: 'user', content: JSON.stringify(transcript) }
                        ],
                        temperature: 0.5,
                    }),
                });

                if (response.ok) {
                    usedModel = model;
                    break;
                }
                console.warn(`Model ${model} failed with status ${response.status}. Retrying...`);
            } catch (err) {
                console.warn(`Model ${model} failed with error ${err}. Retrying...`);
            }
        }

        if (!response || !response.ok) {
            const errorText = response ? await response.text() : 'All models failed';
            throw new Error(`OpenRouter API error: ${response?.status} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || "";

        // Parse the content if it's JSON, or just use it as text if the model returned text
        // The prompt asks for JSON, but models can be flaky. Let's try to extract fields or fall back.
        let summary = content;
        let rating = 5;

        try {
            // Simple heuristic parsing if the model returns JSON-like text
            if (content.includes('{') && content.includes('}')) {
                const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
                const parsed = JSON.parse(jsonStr);
                summary = `**${parsed.recommendation}**\n\n${parsed.summary}`;
                rating = parsed.rating;
            } else {
                // Fallback text parsing
                summary = content;
                // Try to find rating
                const ratingMatch = content.match(/rating:\s*(\d+)/i);
                if (ratingMatch) rating = parseInt(ratingMatch[1]);
            }
        } catch (e) {
            console.warn('Failed to parse AI summary JSON, using raw text');
        }

        return NextResponse.json({ summary, rating });

    } catch (error: any) {
        console.error('Summary Generation Error:', error);
        return NextResponse.json({ summary: `Failed: ${error.message}`, rating: 0 }, { status: 500 });
    }
}
