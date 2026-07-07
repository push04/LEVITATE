import type { Metadata } from 'next';
import { Suspense } from 'react';
import MarketPulseTrialGate from '@/components/tools/MarketPulseTrialGate';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Market Pulse Trial - Levitate Labs',
  description: 'Invite-only trial of Market Pulse, our daily Indian stock market sentiment and technicals dashboard.',
  robots: { index: false, follow: false },
};

export default function MarketPulseTrialPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-16 text-[var(--foreground)]">
      <div className="mx-auto max-w-5xl">
        <Suspense fallback={null}>
          <MarketPulseTrialGate />
        </Suspense>
      </div>
    </div>
  );
}
