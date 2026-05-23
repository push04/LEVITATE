import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ensureWorkspaceSlug, getWorkspaceUrl } from '@/lib/onboarding';
import { normalizeBusinessRole } from '@/lib/roles';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env';
import { getServiceSupabase } from '@/lib/supabase';
import {
  DEFAULT_PLAN_FEATURE_ACCESS,
  type PortalFeatureAccess,
  normalizeFeatureAccess,
} from '@/lib/business-intelligence';

type SubscriptionRecord = {
  id: string;
  plan_id: string | null;
  status: string | null;
  billing_cycle: string | null;
  user_id: string | null;
  company_id: string | null;
  subdomain_url: string | null;
  workspace_slug: string | null;
  workspace_backlink_url: string | null;
  company_name: string | null;
  created_at: string;
  notes: Record<string, unknown> | null;
};

type PortalSubscriptionLookup = {
  sessionUserId: string;
  accountEmail: string | null;
  companyId: string | null;
};

export type BusinessPortalState = {
  userId: string | null;
  accountEmail: string | null;
  companyId: string | null;
  companyName: string;
  planType: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  isTrial: boolean;
  hasPaidAccess: boolean;
  subscriptionStatus: string;
  planId: string | null;
  planName: string | null;
  billingCycle: string | null;
  workspaceUrl: string | null;
  subdomainUrl: string | null;
  role: string | null;
  accessMode: 'read_only';
  featureAccess: PortalFeatureAccess;
};

const SUBSCRIPTION_SELECT = '*';
const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  'active',
  'authenticated',
  'paid',
  'captured',
  'complete',
  'completed',
  'verified',
  'subscribed',
  'subscription_activated',
  'subscription_charged',
]);

function normalizeStatusValue(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return normalized || null;
}

function isMissingColumnError(error: unknown) {
  const message =
    typeof error === 'object' && error && 'message' in error && typeof error.message === 'string'
      ? error.message.toLowerCase()
      : '';

  return message.includes('column') && message.includes('does not exist');
}

function getSubscriptionNotes(record: SubscriptionRecord) {
  return record.notes ?? {};
}

function getSubscriptionStatusSignals(record: SubscriptionRecord) {
  const notes = getSubscriptionNotes(record);

  return [
    normalizeStatusValue(record.status),
    normalizeStatusValue(notes.subscription_status),
    normalizeStatusValue(notes.razorpay_subscription_status),
    normalizeStatusValue(notes.status),
  ].filter(Boolean) as string[];
}

function isActiveSubscription(record: SubscriptionRecord) {
  const notes = getSubscriptionNotes(record);

  if (getSubscriptionStatusSignals(record).some((status) => ACTIVE_SUBSCRIPTION_STATUSES.has(status))) {
    return true;
  }

  return Boolean(notes.verified_at || notes.confirmed_at);
}

function getDisplaySubscriptionStatus(record: SubscriptionRecord | null) {
  if (!record) {
    return 'none';
  }

  if (isActiveSubscription(record)) {
    return 'active';
  }

  return normalizeStatusValue(record.status) ?? 'none';
}

function createAuthSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Session is read-only in these lookups.
      },
    },
  });
}

function toSubscriptionRecord(value: unknown): SubscriptionRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.created_at !== 'string') {
    return null;
  }

  return {
    id: row.id,
    plan_id: typeof row.plan_id === 'string' ? row.plan_id : null,
    status: typeof row.status === 'string' ? row.status : null,
    billing_cycle: typeof row.billing_cycle === 'string' ? row.billing_cycle : null,
    user_id: typeof row.user_id === 'string' ? row.user_id : null,
    company_id: typeof row.company_id === 'string' ? row.company_id : null,
    subdomain_url: typeof row.subdomain_url === 'string' ? row.subdomain_url : null,
    workspace_slug: typeof row.workspace_slug === 'string' ? row.workspace_slug : null,
    workspace_backlink_url: typeof row.workspace_backlink_url === 'string' ? row.workspace_backlink_url : null,
    company_name: typeof row.company_name === 'string' ? row.company_name : null,
    created_at: row.created_at,
    notes: row.notes && typeof row.notes === 'object' ? (row.notes as Record<string, unknown>) : null,
  };
}

function dedupeSubscriptions(groups: Array<unknown[] | null | undefined>) {
  const unique = new Map<string, SubscriptionRecord>();

  for (const group of groups) {
    for (const entry of group ?? []) {
      const record = toSubscriptionRecord(entry);
      if (!record) {
        continue;
      }

      const existing = unique.get(record.id);
      if (!existing || new Date(record.created_at).getTime() > new Date(existing.created_at).getTime()) {
        unique.set(record.id, record);
      }
    }
  }

  return Array.from(unique.values()).sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

async function safeSelectMany(query: PromiseLike<{ data: unknown[] | null; error: unknown }>, label: string) {
  try {
    const result = await query;

    if (result.error) {
      if (isMissingColumnError(result.error)) {
        console.warn(`[Business Portal] Skipping ${label} lookup because a column is missing in the live schema.`);
        return [] as unknown[];
      }

      console.error(`[Business Portal] ${label} lookup failed:`, result.error);
      return [] as unknown[];
    }

    return result.data ?? [];
  } catch (error) {
    if (isMissingColumnError(error)) {
      console.warn(`[Business Portal] Skipping ${label} lookup because a column is missing in the live schema.`);
      return [] as unknown[];
    }

    console.error(`[Business Portal] ${label} lookup threw:`, error);
    return [] as unknown[];
  }
}

async function loadMatchingSubscriptions(input: PortalSubscriptionLookup) {
  const service = getServiceSupabase();
  const queries: Array<Promise<unknown[]>> = [];

  if (input.accountEmail) {
    queries.push(
      safeSelectMany(
        service
          .from('onboarding_subscriptions')
          .select(SUBSCRIPTION_SELECT)
          .ilike('email', input.accountEmail)
          .order('created_at', { ascending: false })
          .limit(10),
        'subscription email'
      )
    );
  }

  queries.push(
    safeSelectMany(
      service
        .from('onboarding_subscriptions')
        .select(SUBSCRIPTION_SELECT)
        .contains('notes', { user_id: input.sessionUserId })
        .order('created_at', { ascending: false })
        .limit(10),
      'subscription notes.user_id'
    )
  );

  queries.push(
    safeSelectMany(
      service
        .from('onboarding_subscriptions')
        .select(SUBSCRIPTION_SELECT)
        .eq('user_id', input.sessionUserId)
        .order('created_at', { ascending: false })
        .limit(10),
      'subscription user_id'
    )
  );

  if (input.companyId) {
    queries.push(
      safeSelectMany(
        service
          .from('onboarding_subscriptions')
          .select(SUBSCRIPTION_SELECT)
          .contains('notes', { company_id: input.companyId })
          .order('created_at', { ascending: false })
          .limit(10),
        'subscription notes.company_id'
      )
    );

    queries.push(
      safeSelectMany(
        service
          .from('onboarding_subscriptions')
          .select(SUBSCRIPTION_SELECT)
          .eq('company_id', input.companyId)
          .order('created_at', { ascending: false })
          .limit(10),
        'subscription company_id'
      )
    );
  }

  const results = await Promise.all(queries);
  return dedupeSubscriptions(results);
}

async function loadPlanFeatureAccess(planId: string | null) {
  if (!planId) {
    return { ...DEFAULT_PLAN_FEATURE_ACCESS };
  }

  const service = getServiceSupabase();
  try {
    const { data, error } = await service
      .from('onboarding_plans')
      .select('feature_controls')
      .eq('id', planId)
      .maybeSingle();

    if (error) {
      if (isMissingColumnError(error)) {
        return { ...DEFAULT_PLAN_FEATURE_ACCESS };
      }

      console.error('[Business Portal] plan feature lookup failed:', error);
      return { ...DEFAULT_PLAN_FEATURE_ACCESS };
    }

    return normalizeFeatureAccess(data?.feature_controls ?? DEFAULT_PLAN_FEATURE_ACCESS);
  } catch (error) {
    if (isMissingColumnError(error)) {
      return { ...DEFAULT_PLAN_FEATURE_ACCESS };
    }

    console.error('[Business Portal] plan feature lookup threw:', error);
    return { ...DEFAULT_PLAN_FEATURE_ACCESS };
  }
}

export async function getBusinessPortalState(): Promise<{ sessionUserId: string | null; portal: BusinessPortalState }> {
  const cookieStore = await cookies();
  const authSupabase = createAuthSupabase(cookieStore);

  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return {
      sessionUserId: null,
      portal: {
        userId: null,
        accountEmail: null,
        companyId: null,
        companyName: 'Business Portal',
        planType: null,
        trialStart: null,
        trialEnd: null,
        isTrial: false,
        hasPaidAccess: false,
        subscriptionStatus: 'none',
        planId: null,
        planName: null,
        billingCycle: null,
        workspaceUrl: null,
        subdomainUrl: null,
        role: null,
        accessMode: 'read_only',
        featureAccess: { ...DEFAULT_PLAN_FEATURE_ACCESS },
      },
    };
  }

  const service = getServiceSupabase();
  const accountEmail = (user.email || '').trim().toLowerCase() || null;

  const [companyRes, profileRes] = await Promise.all([
    (async () => {
      try {
        const res = await service
          .from('companies')
          .select('id, name, plan, trial, trial_start, trial_end')
          .eq('owner_id', user.id)
          .maybeSingle();
        if (res.error && isMissingColumnError(res.error)) {
          return service.from('companies').select('id, name').eq('owner_id', user.id).maybeSingle();
        }
        return res;
      } catch {
        return service.from('companies').select('id, name').eq('owner_id', user.id).maybeSingle();
      }
    })(),
    service.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ]);

  const subscriptions = await loadMatchingSubscriptions({
    sessionUserId: user.id,
    accountEmail,
    companyId: companyRes.data?.id ?? null,
  });

  const activeSubscription = subscriptions.find(isActiveSubscription) ?? null;
  const selectedSubscription = activeSubscription ?? subscriptions[0] ?? null;
  const notes = selectedSubscription?.notes ?? null;
  const planName = notes && typeof notes.plan_name === 'string' ? notes.plan_name : null;
  const role = normalizeBusinessRole(profileRes.data?.role);
  const planId = selectedSubscription?.plan_id ?? null;
  const featureAccess = await loadPlanFeatureAccess(planId);
  const companyName = companyRes.data?.name ?? selectedSubscription?.company_name ?? 'Business Portal';
  const planType =
    companyRes.data && typeof (companyRes.data as Record<string, unknown>).plan === 'string'
      ? String((companyRes.data as Record<string, unknown>).plan)
      : null;
  const trialStart =
    companyRes.data && typeof (companyRes.data as Record<string, unknown>).trial_start === 'string'
      ? String((companyRes.data as Record<string, unknown>).trial_start)
      : null;
  const trialEnd =
    companyRes.data && typeof (companyRes.data as Record<string, unknown>).trial_end === 'string'
      ? String((companyRes.data as Record<string, unknown>).trial_end)
      : null;
  const isTrial =
    companyRes.data && typeof (companyRes.data as Record<string, unknown>).trial === 'boolean'
      ? Boolean((companyRes.data as Record<string, unknown>).trial)
      : planType === 'trial';
  const resolvedCompanyId =
    companyRes.data?.id ??
    selectedSubscription?.company_id ??
    (notes && typeof notes.company_id === 'string' ? notes.company_id : null);
  const noteWorkspaceSlug =
    selectedSubscription?.workspace_slug ??
    (notes && typeof notes.workspace_slug === 'string'
      ? notes.workspace_slug
      : notes && typeof notes.subdomain_slug === 'string'
        ? notes.subdomain_slug
        : null);
  const noteWorkspaceUrl =
    selectedSubscription?.workspace_backlink_url ??
    (notes && typeof notes.workspace_url === 'string'
      ? notes.workspace_url
      : notes && typeof notes.backlink_url === 'string'
        ? notes.backlink_url
        : null);
  const legacyWorkspaceUrl = selectedSubscription?.subdomain_url ?? null;
  const fallbackWorkspaceSlug = companyName !== 'Business Portal' ? ensureWorkspaceSlug(companyName) : null;
  const workspaceUrl =
    noteWorkspaceUrl ??
    (noteWorkspaceSlug ? getWorkspaceUrl(noteWorkspaceSlug) : null) ??
    (fallbackWorkspaceSlug ? getWorkspaceUrl(fallbackWorkspaceSlug) : null) ??
    legacyWorkspaceUrl;

  return {
    sessionUserId: user.id,
    portal: {
      userId: user.id,
      accountEmail,
      companyId: resolvedCompanyId ?? null,
      companyName,
      planType,
      trialStart,
      trialEnd,
      isTrial,
      hasPaidAccess: Boolean(activeSubscription),
      subscriptionStatus: getDisplaySubscriptionStatus(selectedSubscription),
      planId,
      planName,
      billingCycle: selectedSubscription?.billing_cycle ?? null,
      workspaceUrl,
      subdomainUrl: legacyWorkspaceUrl,
      role,
      accessMode: 'read_only',
      featureAccess,
    },
  };
}
