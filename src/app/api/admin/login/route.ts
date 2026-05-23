import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    return NextResponse.json(
        {
            success: false,
            error: 'Deprecated endpoint. Use Supabase auth sign-in.',
        },
        { status: 410 }
    );
}

export async function DELETE() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete('admin_session');

        return NextResponse.json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
