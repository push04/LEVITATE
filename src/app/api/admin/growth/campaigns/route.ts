import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { isAuthenticated } = await checkAdminAuth();
        if (!isAuthenticated) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getServiceSupabase();
        const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, data: campaigns || [] });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('[API] campaigns GET error:', message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { isAuthenticated } = await checkAdminAuth();
        if (!isAuthenticated) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name } = body;

        if (!name) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });

        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('campaigns')
            .insert([{ name, status: 'draft', stats_sent: 0, stats_opened: 0, stats_replied: 0 }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('[API] campaigns POST error:', message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
