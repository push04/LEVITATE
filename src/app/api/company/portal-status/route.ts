import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getBusinessPortalState } from '@/lib/business-portal';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authSupabase = createServerClient(
      getSupabaseUrl(),
      getSupabasePublishableKey(),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Read-only session route.
          },
        },
      }
    );

    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { portal } = await getBusinessPortalState();

    return NextResponse.json({
      success: true,
      ...portal,
    });
  } catch (error) {
    console.error('[Company] portal-status failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to fetch portal status' }, { status: 500 });
  }
}
