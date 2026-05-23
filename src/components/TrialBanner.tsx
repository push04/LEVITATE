'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function TrialBanner() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('trial-banner-dismissed');
    if (stored) setDismissed(true);

    async function checkTrial() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('workspaces').select('plan, trial_end').eq('owner_id', user.id).single();
      if (data?.plan === 'trial' && data.trial_end) {
        const end = new Date(data.trial_end);
        const now = new Date();
        const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        setDaysLeft(days);
        if (days <= 3) setDismissed(false); // Reshow if 3 days or less
      }
    }
    checkTrial();
  }, []);

  if (dismissed || daysLeft === null || daysLeft < 0) return null;

  return (
    <div className="bg-[#C8A96E] text-[var(--foreground)] px-4 py-2 flex items-center justify-between text-sm">
      <span>Trial: <strong>{daysLeft} days remaining</strong></span>
      <div className="flex items-center gap-4">
        <Link href="/pricing" className="underline font-semibold">Upgrade Now</Link>
        <button onClick={() => { setDismissed(true); localStorage.setItem('trial-banner-dismissed', 'true'); }} className="text-[var(--muted)] hover:text-[var(--foreground)]">✕</button>
      </div>
    </div>
  );
}
