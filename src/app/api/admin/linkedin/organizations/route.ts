import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOrganizations } from '@/lib/linkedin';
import { checkAdminAuth } from '@/lib/auth';

export async function GET() {
    try {
        const { isAuthenticated } = await checkAdminAuth();
        if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const cookieStore = await cookies();
        const accessToken = cookieStore.get('linkedin_access_token')?.value;

        if (!accessToken) {
            return NextResponse.json({ error: 'Not authenticated with LinkedIn' }, { status: 401 });
        }

        const data = await getOrganizations(accessToken);
        return NextResponse.json({ success: true, data: data });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Internal error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
