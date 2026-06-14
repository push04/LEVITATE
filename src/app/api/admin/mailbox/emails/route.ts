import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('agent_emails')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
    }
}
