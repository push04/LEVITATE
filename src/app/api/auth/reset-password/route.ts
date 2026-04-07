import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use a direct Supabase client with Service Role Key for Admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });
        }

        // 1. Verify Token
        const { data: resetRecord, error: fetchError } = await supabaseAdmin
            .from('password_resets')
            .select('*')
            .eq('token', token)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (fetchError || !resetRecord) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
        }

        const email = resetRecord.email;

        // 2. Find User ID
        // Note: listUsers() is paginated, but listUsers() without params gets first 50. 
        // For production with >50 users, we'd need to paginate or use a direct DB query if we had access to auth schema (we don't easily).
        // A better way is to use `getUserByEmail` if available in admin api? 
        // supabaseAdmin.auth.admin.listUsers() is the standard way.
        // Let's rely on listUsers() for now or assume the email matches a specific profile we can query?
        // Actually, we can just update the user by email? No, UpdateUserById needs ID.

        // Let's try to get the user ID.
        // Alternative: creating a new client and signing in? No needed admin rights.

        // Fetch user from Supabase Auth
        // Logic: Iterate or filter? Supabase Admin API typically requires ID.
        // Let's use `listUsers` and filter.

        let userId = null;
        let page = 1;
        let hasMore = true;

        while (hasMore && !userId) {
            const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page: page, perPage: 100 });
            if (usersError) throw usersError;

            const found = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
            if (found) {
                userId = found.id;
            }

            if (usersData.users.length < 100) hasMore = false;
            page++;
        }

        if (!userId) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 3. Update Password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: password }
        );

        if (updateError) {
            throw updateError;
        }

        // 4. Mark Token Used
        await supabaseAdmin
            .from('password_resets')
            .update({ used: true })
            .eq('id', resetRecord.id);

        return NextResponse.json({ success: true, message: 'Password updated successfully' });

    } catch (error: any) {
        console.error('Reset Password Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
