'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_PLAN_FEATURE_ACCESS,
  type PortalFeatureAccess,
} from '@/lib/business-intelligence';

type PortalState = {
  loading: boolean;
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

const INITIAL_STATE: PortalState = {
  loading: true,
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
};

export function useCompanyPortalState() {
  const [state, setState] = useState<PortalState>(INITIAL_STATE);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        let response: Response | null = null;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          response = await fetch('/api/company/portal-status', {
            method: 'GET',
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok || (response.status !== 401 && response.status < 500)) {
            break;
          }

          if (attempt < 2) {
            await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
          }
        }

        if (!response?.ok) {
          if (active) {
            setState({ ...INITIAL_STATE, loading: false });
          }
          return;
        }

        const data = await response.json();
        if (!data?.success) {
          if (active) {
            setState({ ...INITIAL_STATE, loading: false });
          }
          return;
        }

        if (active) {
          setState({
            loading: false,
            userId: data.userId ?? null,
            accountEmail: data.accountEmail ?? null,
            companyId: data.companyId ?? null,
            companyName: data.companyName ?? 'Business Portal',
            planType: data.planType ?? null,
            trialStart: data.trialStart ?? null,
            trialEnd: data.trialEnd ?? null,
            isTrial: Boolean(data.isTrial),
            hasPaidAccess: Boolean(data.hasPaidAccess),
            subscriptionStatus: data.subscriptionStatus ?? 'none',
            planId: data.planId ?? null,
            planName: data.planName ?? null,
            billingCycle: data.billingCycle ?? null,
            workspaceUrl: data.workspaceUrl ?? data.subdomainUrl ?? null,
            subdomainUrl: data.subdomainUrl ?? null,
            role: data.role ?? null,
            accessMode: data.accessMode === 'read_only' ? 'read_only' : 'read_only',
            featureAccess: data.featureAccess ?? { ...DEFAULT_PLAN_FEATURE_ACCESS },
          });
        }
      } catch (error) {
        console.error('Error loading company portal state:', error);
        if (active) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  return state;
}
