
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
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
    const { key, value } = await request.json();
    const supabase = getServiceSupabase();

    const { error } = await supabase.from('settings').upsert({ key, value });

    if (error) return NextResponse.json({ success: false, error: error.message });
    return NextResponse.json({ success: true });
}
