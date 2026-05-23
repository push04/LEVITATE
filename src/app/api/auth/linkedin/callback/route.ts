import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/linkedin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
        // Redirect to admin with friendly error flag
        if (error === 'unauthorized_scope_error') {
            return NextResponse.redirect(new URL('/admin/dashboard?error=linkedin_scope', request.url));
        }
        return NextResponse.redirect(new URL(`/admin/dashboard?error=${encodeURIComponent(error)}`, request.url));
    }

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    try {
        const tokenData = await getAccessToken(code);

        // Store in HTTP-only cookie for session persistence in MVP
        const response = NextResponse.redirect(new URL('/admin/dashboard', request.url));

        // Set cookie with 60 days expiry (approx token life)
        response.cookies.set('linkedin_access_token', tokenData.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 60 // 60 days
        });

        return response;
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
