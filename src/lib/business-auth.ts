import { getServiceSupabase } from '@/lib/supabase';

type ServiceSupabase = ReturnType<typeof getServiceSupabase>;

type UpsertBusinessProfileInput = {
  userId: string;
  email: string;
  fullName: string;
  status?: 'active' | 'inactive' | 'suspended' | 'deleted';
};

const BUSINESS_ROLE_CANDIDATES = ['business', 'company_admin', 'employee'] as const;

function isRoleConstraintError(error: { code?: string | null; message?: string | null } | null | undefined) {
  if (!error) {
    return false;
  }

  return (
    error.code === '23514' ||
    error.message?.includes('profiles_role_check') ||
    error.message?.toLowerCase().includes('check constraint')
  );
}

export async function upsertBusinessProfile(
  service: ServiceSupabase,
  input: UpsertBusinessProfileInput
) {
  let lastError: { code?: string | null; message?: string | null } | null = null;

  for (const role of BUSINESS_ROLE_CANDIDATES) {
    const { error } = await service.from('profiles').upsert({
      id: input.userId,
      email: input.email,
      full_name: input.fullName,
      role,
      status: input.status ?? 'active',
    });

    if (!error) {
      return { success: true as const, role };
    }

    lastError = error;
    if (!isRoleConstraintError(error)) {
      return { success: false as const, error };
    }
  }

  return {
    success: false as const,
    error:
      lastError ??
      ({
        message: 'Unable to store a compatible business profile role.',
      } as const),
  };
}
