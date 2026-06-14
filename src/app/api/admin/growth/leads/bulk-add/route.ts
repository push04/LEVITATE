import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { leads, campaign_id } = body;

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ success: false, error: 'No leads provided' }, { status: 400 });
        }

        const supabase = getServiceSupabase();
        const leadsToInsert = leads.map((lead: Record<string, string | undefined>) => {
            const email = lead.email || `${lead.source_id || Date.now()}@${(lead.source ?? 'unknown').toLowerCase()}.social`;
            return {
                campaign_id: campaign_id || null,
                email,
                name: lead.name || email.split('@')[0],
                source: lead.source || 'Manual',
                status: 'pending',
                current_step: 1,
            };
        });

        const { data, error } = await supabase
            .from('campaign_leads')
            .insert(leadsToInsert)
            .select();

        if (error) throw error;

        return NextResponse.json({ success: true, count: data.length, data });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Bulk Add Error:', message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
