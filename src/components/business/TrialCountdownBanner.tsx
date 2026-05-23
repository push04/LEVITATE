'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';

const STORAGE_KEY = 'levitateos.trial-banner.dismissed.v1';

function daysRemaining(trialEndIso: string) {
  const end = new Date(trialEndIso).getTime();
  const now = Date.now();
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export default function TrialCountdownBanner() {
  const portal = useCompanyPortalState();
  const isTrial = Boolean(portal.isTrial) || portal.planType === 'trial';

  const remaining = useMemo(() => {
    if (!portal.trialEnd) return null;
    return daysRemaining(portal.trialEnd);
  }, [portal.trialEnd]);

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === 'true');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!isTrial || remaining == null) return null;

  const forceShow = remaining <= 3;
  if (dismissed && !forceShow) return null;

  return (
    <div className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[rgba(15,14,11,0.92)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-4 py-3 sm:px-5 md:px-8 lg:px-9">
        <div className="text-sm text-[var(--text-secondary)]">
          Trial: <span className="font-semibold text-[var(--text-primary)]">{remaining}</span> days remaining
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/business/dashboard/subscribe"
            className="inline-flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-3 py-2 text-xs font-semibold text-[var(--text-inverse)] hover:brightness-105"
          >
            Upgrade Now
          </Link>
          <button
            type="button"
            aria-label="Dismiss trial banner"
            onClick={() => {
              setDismissed(true);
              try {
                window.localStorage.setItem(STORAGE_KEY, 'true');
              } catch {
                // ignore
              }
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--border-strong)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

