import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;
    const supabase = await createClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { step_order, day_offset, subject, body: emailBody } = body;

        // Validation
        if (!subject || !emailBody) {
            return NextResponse.json({ success: false, error: 'Subject and Body are required' }, { status: 400 });
        }

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

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
