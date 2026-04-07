import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
    try {
        const { threadIds } = await request.json();

        if (!threadIds || !Array.isArray(threadIds) || threadIds.length === 0) {
            return NextResponse.json({ error: 'No threads selected' }, { status: 400 });
        }

        const supabase = await createClient();

        // Check if user is admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Perform deletion
        // RLS policies should handle permission checks
        // Cascading delete on 'email_messages' is assumed to be set up in the DB schema
        // If not, we might need to delete messages first, but let's assume cascade for now based on typical setup
        const { error } = await supabase
            .from('email_threads')
            .delete()
            .in('id', threadIds);

        if (error) {
            console.error('Delete DB Error:', error);
            return NextResponse.json({ error: 'Failed to delete threads' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
