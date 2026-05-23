'use client';

import { useEffect, useState } from 'react';

type QuotaState = {
  loading: boolean;
  remaining: number;
  used: number;
  limit: number;
  timeZone: string;
  dayLabel: string;
};

const INITIAL_STATE: QuotaState = {
  loading: true,
  remaining: 0,
  used: 0,
  limit: 0,
  timeZone: 'Asia/Kolkata',
  dayLabel: '',
};

const DISABLED_STATE: QuotaState = {
  ...INITIAL_STATE,
  loading: false,
};

export function useBusinessResearchQuota(enabled: boolean) {
  const [state, setState] = useState<QuotaState>(() => (enabled ? INITIAL_STATE : DISABLED_STATE));

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

    const load = async () => {
      try {
        const response = await fetch(`/api/business/research/quota?timezone=${encodeURIComponent(timezone)}`, {
          cache: 'no-store',
        });

        const data = await response.json();
        if (!active || !response.ok || !data?.success) {
          setState((prev) => ({ ...prev, loading: false, timeZone: timezone }));
          return;
        }

        setState({
          loading: false,
          remaining: data.remaining ?? 0,
          used: data.used ?? 0,
          limit: data.limit ?? 0,
          timeZone: data.timeZone ?? timezone,
          dayLabel: data.dayLabel ?? '',
        });
      } catch (error) {
        console.error('Failed to load research quota', error);
        if (active) {
          setState((prev) => ({ ...prev, loading: false, timeZone: timezone }));
        }
      }
    };

    load();

    const handleRefresh = () => {
      setState(prev => ({ ...prev, loading: true }));
      load();
    };

    window.addEventListener('business-research-quota-refresh', handleRefresh);

    return () => {
      active = false;
      window.removeEventListener('business-research-quota-refresh', handleRefresh);
    };
  }, [enabled]);

  return enabled ? state : DISABLED_STATE;
}
