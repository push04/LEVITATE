import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function PUT(request: Request) {
    try {
        const { id, title, slug, category, content, excerpt, cover_image, read_time, published } = await request.json();

        // Basic validation
        if (!id || !title || !content) {
            return NextResponse.json({ error: 'Missing required fields (id, title, content)' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('posts')
            .update({
                title,
                slug, // Optional update, usually slugs stay unless explicitly changed, but we allow it
                category,
                content,
                excerpt,
                cover_image,
                read_time,
                published,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Supabase Update Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, post: data });

    } catch (error: any) {
        console.error('Update API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
