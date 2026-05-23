import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase-env';

export const runtime = 'edge';

export async function GET() {
    const supabase = createClient(
        getSupabaseUrl(),
        getSupabaseServiceRoleKey()
    );

    // Check if table exists and works
    const { count, error: tableError } = await supabase
        .from('social_posts')
        .select('*', { count: 'exact', head: true });

    if (tableError) {
        return NextResponse.json({ success: false, error: tableError });
    }

    return NextResponse.json({ success: true, count });




    return NextResponse.json({ success: true });
}
