import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { queueBusinessLeadWhatsApp } from '@/lib/whatsapp/queue-business-lead';

export async function POST(request: Request) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();

        // Explicit field extraction — prevent mass assignment
        const displayName = (body.business_name || body.name || '').trim();
        if (!displayName) {
            return NextResponse.json({ success: false, error: 'business_name is required' }, { status: 400 });
        }

        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('leads')
            .insert([{
                name: displayName,
                email: body.email ?? null,
                phone: body.phone ?? null,
                city: body.city ?? null,
                service_category: body.service_category ?? null,
                budget: body.budget ?? null,
                message: body.message ?? null,
                source: body.source ?? 'manual_entry',
                status: body.status ?? 'New',
                score: typeof body.score === 'number' ? body.score : 0,
                created_at: new Date().toISOString(),
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
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
    }
}
