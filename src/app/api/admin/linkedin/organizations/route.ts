
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOrganizations } from '@/lib/linkedin';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('linkedin_access_token')?.value;

        if (!accessToken) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const data = await getOrganizations(accessToken);

        // Data structure from LinkedIn is complex (elements array). 
        // We accept the raw response and let frontend parse or parse here.
        // Usually: data.elements[].organizationalTarget (URN)

        return NextResponse.json({ success: true, data: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
