import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
    try {
        console.log('[API] Fetching campaigns...');
        const supabase = await createClient();

        // Fetch user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error('[API] Session Error:', sessionError);
            return NextResponse.json({ success: false, error: sessionError.message }, { status: 401 });
        }

        if (!session) {
            console.error('[API] No session found');
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[API] Database Error:', error);
            throw error;
        }

        console.log(`[API] Found ${campaigns?.length} campaigns`);
        return NextResponse.json({ success: true, data: campaigns || [] });

    } catch (error: any) {
        console.error('[API] Uncaught Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name } = body;

        if (!name) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });

        const { data, error } = await supabase
            .from('campaigns')
            .insert([{ name, status: 'draft', stats_sent: 0, stats_opened: 0, stats_replied: 0 }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('[API] POST Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
