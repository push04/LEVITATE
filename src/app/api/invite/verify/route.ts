import { getServiceSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    try {
        const supabase = getServiceSupabase();

        // Find invitation
        const { data: invitation, error } = await supabase
            .from('invitations')
            .select('*, departments(name)')
            .eq('token', token)
            .single();

        if (error || !invitation) {
            return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
        }

        if (invitation.status !== 'pending') {
            return NextResponse.json({ error: 'Invitation already accepted or expired' }, { status: 400 });
        }

        // Check expiry
        if (new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Invitation expired' }, { status: 400 });
        }

        return NextResponse.json({
            valid: true,
            email: invitation.email,
            role: invitation.role,
            department: invitation.department || invitation.departments?.name, // Use text column first
            department_id: invitation.department_id,
            name: invitation.name
        });

    } catch (error: unknown) {
        console.error('Verify error:', error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
