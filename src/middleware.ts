import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Protect /admin routes (except the login page itself)
    if (pathname.startsWith('/admin') && pathname !== '/admin') {
        const adminSession = request.cookies.get('admin_session');

        if (!adminSession?.value) {
            // Redirect to login page
            return NextResponse.redirect(new URL('/admin', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
