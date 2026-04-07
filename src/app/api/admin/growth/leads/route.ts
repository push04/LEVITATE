import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const campaignFilter = searchParams.get('campaignId');
        const statusFilter = searchParams.get('status');
        const search = searchParams.get('q');

        let query = supabase
            .from('campaign_leads')
            .select(`
                *,
                campaigns (
                    id,
                    name
                )
            `)
            .order('created_at', { ascending: false });

        if (campaignFilter && campaignFilter !== 'all') {
            query = query.eq('campaign_id', campaignFilter);
        }

        if (statusFilter && statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error fetching leads:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
