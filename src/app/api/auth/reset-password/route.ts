import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase-env';

function getSupabaseAdmin() {
    return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey());
}

function isStrongPassword(password: string) {
    return (
        password.length >= 10 &&
        /[a-z]/.test(password) &&
        /[A-Z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await request.json();
        const token = String(body?.token || '').trim();
        const password = String(body?.password || '');

        if (!token || !password) {
            return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });
        }

        if (!isStrongPassword(password)) {
            return NextResponse.json(
                { error: 'Password must be at least 10 chars and include upper, lower, number, and symbol.' },
                { status: 400 }
            );
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const fetchResetRecord = async (tokenValue: string) =>
            supabaseAdmin
                .from('password_resets')
                .select('*')
                .eq('token', tokenValue)
                .eq('used', false)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle();

        // Prefer hashed token lookup, fallback once for legacy plaintext rows.
        let { data: resetRecord, error: fetchError } = await fetchResetRecord(tokenHash);
        if (!resetRecord) {
            const legacyLookup = await fetchResetRecord(token);
            resetRecord = legacyLookup.data;
            fetchError = legacyLookup.error;
        }

        if (fetchError || !resetRecord) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
        }

        // Mark token as used before password update to block replay in race scenarios.
        const { data: consumeRecord, error: consumeError } = await supabaseAdmin
            .from('password_resets')
            .update({ used: true })
            .eq('id', resetRecord.id)
            .eq('used', false)
            .select('id')
            .maybeSingle();

        if (consumeError || !consumeRecord) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
        }

        const email = resetRecord.email;

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

        // Update password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: password }
        );

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({ success: true, message: 'Password updated successfully' });

    } catch (error: unknown) {
        console.error('Reset Password Error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
