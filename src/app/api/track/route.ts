import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { event_type, page_url, referrer, utm_source, utm_medium, utm_campaign } = body;
        if (!event_type) return NextResponse.json({ error: 'event_type required' }, { status: 400 });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
