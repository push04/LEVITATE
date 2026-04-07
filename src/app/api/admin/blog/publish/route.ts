import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { title, slug, category, content, excerpt, cover_image, read_time, published } = await request.json();

        // Basic validation
        if (!title || !slug || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('posts')
            .insert({
                title,
                slug,
                category,
                content,
                excerpt,
                cover_image,
                read_time,
                published,
                // optionally author_id if we want to track who posted, or we can leave it null/default
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase Store Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, post: data });

    } catch (error: any) {
        console.error('Publish API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
