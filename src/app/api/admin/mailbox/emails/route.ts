import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('agent_emails')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
