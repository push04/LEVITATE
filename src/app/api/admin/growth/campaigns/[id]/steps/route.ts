import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const { id } = params;

    try {
        const body = await request.json();
        const { step_order, day_offset, subject, body: emailBody } = body;

        if (!subject || !emailBody) {
            return NextResponse.json({ success: false, error: 'Subject and Body are required' }, { status: 400 });
        }

        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('campaign_steps')
            .insert([{
                campaign_id: id,
                step_order: step_order || 1,
                day_offset: day_offset || 0,
                subject,
                body: emailBody
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
