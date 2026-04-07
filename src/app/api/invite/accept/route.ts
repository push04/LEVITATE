import { getServiceSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token, password, full_name } = body;

        if (!token || !password || !full_name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        // 1. Verify Invitation again
        const { data: invitation, error: inviteError } = await supabase
            .from('invitations')
            .select('*')
            .eq('token', token)
            .single();

        if (inviteError || !invitation || invitation.status !== 'pending') {
            return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 });
        }

        // 2. Create Auth User (Admin API)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: invitation.email,
            password: password,
            email_confirm: true,
            user_metadata: { full_name }
        });

        if (authError) {
            // Check if user already exists
            if (authError.message.includes('already registered')) {
                // Handle case where user exists but needs access
                return NextResponse.json({ error: 'User already exists. Please login instead.' }, { status: 400 });
            }
            throw authError;
        }

        const userId = authData.user.id;

        // 3. Update Profile (Role & Department)
        // Trigger might have created profile with default role/dept, so we update it
        // Or if trigger failed/didn't run, we insert/upsert
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                email: invitation.email,
                full_name: full_name,
                role: invitation.role,
                department_id: invitation.department_id,
                status: 'active'
            });

        if (profileError) {
            console.error('Profile update error:', profileError);
            // Don't fail the whole request but log it
        }

        // 4. Mark Invitation as Accepted
        await supabase
            .from('invitations')
            .update({ status: 'accepted' })
        // 4. Mark Invitation as Accepted
        await supabase
            .from('invitations')
            .update({ status: 'accepted' })
            .eq('id', invitation.id);

        // 5. If Company Invite, Update Company Owner
        if (invitation.company_id) {
            await supabase
                .from('companies')
                .update({ owner_id: userId })
                .eq('id', invitation.company_id)
                .is('owner_id', null); // Only if no owner yet
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Accept invite error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
