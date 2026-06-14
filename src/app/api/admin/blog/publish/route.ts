import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { title, slug, category, content, excerpt, cover_image, read_time, published } = body;

        if (!title || !slug || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('posts')
            .insert({ title, slug, category, content, excerpt, cover_image, read_time, published })
            .select()
            .single();

        if (error) {
            console.error('Supabase Store Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, post: data });
    } catch (error: unknown) {
        console.error('Publish API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
