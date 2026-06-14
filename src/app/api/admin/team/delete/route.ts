import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { isAuthenticated, role } = await checkAdminAuth();
        if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Delete is restricted to super_admin only
        if (role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden: Only Super Admins can delete users' }, { status: 403 });
        }

        const body = await request.json();
        const { userId } = body;

        if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

        const supabase = getServiceSupabase();
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ status: 'suspended' })
            .eq('id', userId);

        if (profileError) throw profileError;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Delete User Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
    }
}
