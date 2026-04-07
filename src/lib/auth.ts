import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function checkAdminAuth(request: NextRequest): Promise<{ isAuthenticated: boolean }> {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session');

    if (!sessionToken || !sessionToken.value) {
        return { isAuthenticated: false };
    }

    // Basic validity check - ensures token exists
    // In a production app, you would verify the JWT signature or database session here

    return { isAuthenticated: true };
}
