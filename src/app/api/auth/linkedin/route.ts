import { NextResponse } from 'next/server';
import { getAuthUrl, getOrganizationAuthUrl } from '@/lib/linkedin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'company') {
        return NextResponse.redirect(getOrganizationAuthUrl());
    }

    return NextResponse.redirect(getAuthUrl());
}
