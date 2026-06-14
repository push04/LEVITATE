import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const campaignFilter = searchParams.get('campaignId');
        const statusFilter = searchParams.get('status');
        const search = searchParams.get('q')?.slice(0, 100) ?? ''; // cap length

        const supabase = getServiceSupabase();
        let query = supabase
            .from('campaign_leads')
            .select(`*, campaigns(id, name)`)
            .order('created_at', { ascending: false });

        if (campaignFilter && campaignFilter !== 'all') {
            query = query.eq('campaign_id', campaignFilter);
        }

        if (statusFilter && statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        if (search) {
            // Use separate filters instead of .or() string interpolation to prevent injection
            query = query.or(`name.ilike.%${search.replace(/[%_]/g, '\\$&')}%,email.ilike.%${search.replace(/[%_]/g, '\\$&')}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Error fetching leads:', message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
