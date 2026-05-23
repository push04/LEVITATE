'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import type { PortalFeatureKey } from '@/lib/business-intelligence';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import BusinessPortalLocked from '@/components/business/BusinessPortalLocked';

export default function PortalFeatureGuard({
  feature,
  title,
  description,
  children,
}: {
  feature: PortalFeatureKey;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const portal = useCompanyPortalState();

  if (portal.loading) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--muted)]">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#c8a96e]" />
        <div className="mt-4">Loading workspace access…</div>
      </div>
    );
  }

  if (!portal.hasPaidAccess || !portal.featureAccess[feature]) {
    return (
      <BusinessPortalLocked
        companyName={portal.companyName}
        subscriptionStatus={portal.subscriptionStatus}
        planName={portal.planName}
        billingCycle={portal.billingCycle}
        subdomainUrl={portal.workspaceUrl}
        title={title}
        description={description}
      />
    );
  }

  return <>{children}</>;
}
