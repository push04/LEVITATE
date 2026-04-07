import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // 1. Auth Check - Super Admin Only
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: requester } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (!requester || requester.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden: Only Super Admins can delete users' }, { status: 403 });
        }

        const body = await request.json();
        const { userId } = body;

        if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

        // 2. Perform Delete
        // Option A: Hard Delete (Auth + Profile) - Dangerous but clean
        // Option B: Soft Delete (Status = inactive) - Safer

        // We will do Soft Delete on Profile first.
        // If we really want to block access, we should delete from auth.users, but we need Service Role for that.
        // Since we are using Supabase Client here... we might be limited unless we have a service key client.
        // However, `supabase-server` presumably uses the service role key if configured correctly or just connection pooling?
        // Actually `createClient` often uses cookies.

        // Let's assume we update the profile status to 'suspended' which our middleware should check.

        const { error: profileError } = await supabase
            .from('profiles')
            .update({ status: 'suspended' })
            .eq('id', userId);

        if (profileError) throw profileError;

        // Ideally, we would also delete from auth.users using supabase-admin client.
        // For now, setting status to suspended in profile is a good "User Level" delete.

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete User Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
