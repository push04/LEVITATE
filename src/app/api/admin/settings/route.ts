import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const supabase = getServiceSupabase();

    if (key) {
        const { data, error } = await supabase.from('settings').select('value').eq('key', key).single();
        if (error) return NextResponse.json({ success: false, error: error.message });
        return NextResponse.json({ success: true, value: data?.value });
    }

    const { data, error } = await supabase.from('settings').select('*');
    if (error) return NextResponse.json({ success: false, error: error.message });
    return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const { key, value } = body;
    if (!key || typeof key !== 'string') return NextResponse.json({ error: 'key is required' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { error } = await supabase.from('settings').upsert({ key, value });
    if (error) return NextResponse.json({ success: false, error: error.message });
    return NextResponse.json({ success: true });
}
