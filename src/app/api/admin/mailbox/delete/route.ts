import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { threadIds } = await request.json();

        if (!threadIds || !Array.isArray(threadIds) || threadIds.length === 0) {
            return NextResponse.json({ error: 'No threads selected' }, { status: 400 });
        }

        const supabase = getServiceSupabase();
        const { error } = await supabase
            .from('email_threads')
            .delete()
            .in('id', threadIds);

        if (error) {
            console.error('Delete DB Error:', error);
            return NextResponse.json({ error: 'Failed to delete threads' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Delete API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
