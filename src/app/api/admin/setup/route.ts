import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
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
