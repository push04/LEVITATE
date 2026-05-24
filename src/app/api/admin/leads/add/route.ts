
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { queueBusinessLeadWhatsApp } from '@/lib/whatsapp/queue-business-lead';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // This is a protected processing route.
        // Ideally, we check for a session token here too, but for now we trust the endpoint
        // is called by the admin dashboard which is protected.

        const supabase = getServiceSupabase();

        // Validate required fields — DB column is `business_name`
        const displayName = body.business_name || body.name;
        if (!displayName) {
            return NextResponse.json({ success: false, error: 'business_name is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('leads')
            .insert([{
                ...body,
                business_name: displayName,   // ensure correct DB column
                created_at: body.created_at ?? new Date().toISOString(),
                status: body.status ?? 'New',
                source: body.source ?? 'manual_entry'
            }])
            .select()
            .single();

        if (error) {
            console.error('[leads/add] DB error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        await queueBusinessLeadWhatsApp(data);

        return NextResponse.json({ success: true, data });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
