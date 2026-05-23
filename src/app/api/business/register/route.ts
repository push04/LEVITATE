import { NextResponse } from 'next/server';
import { upsertBusinessProfile } from '@/lib/business-auth';
import { getServiceSupabase } from '@/lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUSINESS_SETUP_ERROR = 'Business account setup is incomplete. Please contact support before trying again.';

export const dynamic = 'force-dynamic';

async function cleanupFailedUser(userId: string, service: ReturnType<typeof getServiceSupabase>) {
  try {
    await service.auth.admin.deleteUser(userId);
  } catch (cleanupError) {
    console.error('[Business Register] Failed to clean up user after setup error:', cleanupError);
  }
}

function formatSetupError(error: { code?: string | null; message?: string | null } | null | undefined) {
  if (!error) {
    return 'Unable to finish creating your business account.';
  }

  if (error.code === '23514' || error.message?.includes('profiles_role_check')) {
    return BUSINESS_SETUP_ERROR;
  }

  return error.message || 'Unable to finish creating your business account.';
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');
    const ownerName = String(payload.ownerName || '').trim();
    const companyName = String(payload.companyName || '').trim();

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ success: false, error: 'Enter a valid work email.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    if (!ownerName || !companyName) {
      return NextResponse.json({ success: false, error: 'Owner name and company name are required.' }, { status: 400 });
    }

    const service = getServiceSupabase();

    const { data: userData, error: createUserError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
        company_name: companyName,
        role: 'employee',
        requested_portal_role: 'business',
      },
    });

    if (createUserError || !userData.user?.id) {
      const raw = createUserError?.message?.toLowerCase() || '';
      if (raw.includes('already') || raw.includes('exists') || raw.includes('registered')) {
        return NextResponse.json(
          { success: false, error: 'This email is already registered. Please sign in.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, error: createUserError?.message || 'Unable to create account.' },
        { status: 500 }
      );
    }

    const userId = userData.user.id;

    const profileResult = await upsertBusinessProfile(service, {
      userId,
      email,
      fullName: ownerName,
      status: 'active',
    });

    if (!profileResult.success) {
      await cleanupFailedUser(userId, service);
      return NextResponse.json({ success: false, error: formatSetupError(profileResult.error) }, { status: 500 });
    }

    const { data: existingCompany, error: existingCompanyError } = await service
      .from('companies')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (existingCompanyError) {
      await cleanupFailedUser(userId, service);
      return NextResponse.json(
        { success: false, error: existingCompanyError.message || 'Unable to prepare your company workspace.' },
        { status: 500 }
      );
    }

    if (existingCompany?.id) {
      const { error: companyUpdateError } = await service
        .from('companies')
        .update({ name: companyName, status: 'active' })
        .eq('id', existingCompany.id);

      if (companyUpdateError) {
        await cleanupFailedUser(userId, service);
        return NextResponse.json(
          { success: false, error: companyUpdateError.message || 'Unable to prepare your company workspace.' },
          { status: 500 }
        );
      }
    } else {
      const { error: companyInsertError } = await service
        .from('companies')
        .insert({ name: companyName, owner_id: userId, status: 'active' });

      if (companyInsertError) {
        await cleanupFailedUser(userId, service);
        return NextResponse.json(
          { success: false, error: companyInsertError.message || 'Unable to prepare your company workspace.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Registration failed.' },
      { status: 500 }
    );
  }
}
