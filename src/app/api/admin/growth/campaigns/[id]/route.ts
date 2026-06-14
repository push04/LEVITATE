import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

const ALLOWED_UPDATE_FIELDS = ['name', 'status', 'description', 'stats_sent', 'stats_opened', 'stats_replied'] as const;
type AllowedField = typeof ALLOWED_UPDATE_FIELDS[number];

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const { id } = params;
    const supabase = getServiceSupabase();

    try {
        const { data: campaign, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!campaign) return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });

        const { data: steps } = await supabase
            .from('campaign_steps')
            .select('*')
            .eq('campaign_id', id)
            .order('step_order', { ascending: true });

        const { count: leadsCount } = await supabase
            .from('campaign_leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', id);

        return NextResponse.json({
            success: true,
            data: { ...campaign, steps: steps || [], leadsCount: leadsCount || 0 }
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const { id } = params;

    try {
        const body = await request.json();

        // Only allow safe fields — prevent mass assignment
        const safeUpdate: Partial<Record<AllowedField, unknown>> = {};
        for (const field of ALLOWED_UPDATE_FIELDS) {
            if (field in body) safeUpdate[field] = body[field];
        }

        if (Object.keys(safeUpdate).length === 0) {
            return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
        }

        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('campaigns')
            .update(safeUpdate)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
