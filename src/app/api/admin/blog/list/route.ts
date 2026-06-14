
import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const supabase = getServiceSupabase();

        // Fetch all posts, ordered by newest first
        const { data, error } = await supabase
            .from('posts')
            .select('id, title, category, created_at, slug, content')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            posts: data
        });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
    }
}
