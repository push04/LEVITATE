import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceSupabase();

    try {
        const body = await request.json();
        const { campaign_id, email, name, source, source_id } = body;

        if (!campaign_id || !email) {
            return NextResponse.json({ success: false, error: 'Campaign ID and Email are required' }, { status: 400 });
        }

        // Check if lead already exists in this campaign
        const { data: existing } = await supabase
            .from('campaign_leads')
            .select('id')
            .eq('campaign_id', campaign_id)
            .eq('email', email)
            .single();

        if (existing) {
            return NextResponse.json({ success: false, error: 'Lead already in this campaign' }, { status: 409 });
        }

        // Insert new lead
        const { data, error } = await supabase
            .from('campaign_leads')
            .insert([{
                campaign_id,
                email,
                name: name || email.split('@')[0], // Fallback name
                status: 'pending',
                current_step: 1,
                // We could store source metadata if we added a jsonb column, but for now we just store the lead
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
