import { NextRequest, NextResponse } from 'next/server';
import {
  QUALIFICATION_SYSTEM_PROMPT,
  RECOMMENDER_SYSTEM_PROMPT,
  SUMMARIZER_SYSTEM_PROMPT,
  SERVICES,
} from '@/lib/groq/prompts';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

function getKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');
  return key;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages = [], step = 'continue', selectedServices = [], businessName = '', contactName = '' } = body;

    const key = getKey();

    // ── Qualification streaming ──────────────────────────────────────────────
    if (step === 'start' || step === 'continue') {
      const groqRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'system', content: QUALIFICATION_SYSTEM_PROMPT }, ...messages],
          stream: true,
          max_tokens: 250,
          temperature: 0.4,
        }),
      });

      if (!groqRes.ok || !groqRes.body) {
        throw new Error(`Groq ${groqRes.status}`);
      }

      return new Response(groqRes.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // ── Service recommender ──────────────────────────────────────────────────
    if (step === 'recommend') {
      const conversation = messages
        .map((m: { role: string; content: string }) =>
          `${m.role === 'assistant' ? 'Levitate AI' : 'Prospect'}: ${m.content}`)
        .join('\n');

      const groqRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: RECOMMENDER_SYSTEM_PROMPT },
            { role: 'user', content: `Qualification conversation:\n${conversation}` },
          ],
          stream: false,
          max_tokens: 300,
          temperature: 0.3,
        }),
      });

      const data = await groqRes.json();
      return NextResponse.json({ content: data.choices?.[0]?.message?.content ?? '{}' });
    }

    // ── Proposal summarizer ──────────────────────────────────────────────────
    if (step === 'summarize') {
      const conversation = messages
        .map((m: { role: string; content: string }) =>
          `${m.role === 'assistant' ? 'Levitate AI' : 'Prospect'}: ${m.content}`)
        .join('\n');

      const serviceNames = (selectedServices as string[])
        .map(slug => SERVICES.find(s => s.slug === slug)?.name ?? slug)
        .join(', ');

      const groqRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SUMMARIZER_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Business name: ${businessName}\nContact name: ${contactName}\nSelected services: ${serviceNames}\n\nQualification conversation:\n${conversation}`,
            },
          ],
          stream: false,
          max_tokens: 400,
          temperature: 0.5,
        }),
      });

      const data = await groqRes.json();
      return NextResponse.json({ content: data.choices?.[0]?.message?.content ?? '' });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[intake/groq-qualify]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
