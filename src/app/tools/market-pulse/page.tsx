import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LineChart, ShieldCheck, Sparkles } from 'lucide-react';
import MarketPulseTrialGate from '@/components/tools/MarketPulseTrialGate';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Market Pulse Trial - Levitate Labs',
  description: 'Invite-only trial of Market Pulse, our daily Indian stock market sentiment and technicals dashboard.',
  robots: { index: false, follow: false },
};

const FEATURES = [
  {
    icon: LineChart,
    title: 'Daily sentiment + technicals',
    body: 'A watchlist chosen fresh every day from real market movers and news coverage, with RSI, MACD, moving averages, and more.',
  },
  {
    icon: Sparkles,
    title: 'Tracked predictions',
    body: 'Every bullish/bearish/neutral call is recorded and auto-graded against the real price seven trading days later.',
  },
  {
    icon: ShieldCheck,
    title: 'Nothing asserted without being checked',
    body: 'The technical read is a deterministic rules engine over real price data - not a black box, and not investment advice.',
  },
];

export default function MarketPulseTrialPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="border-b border-[var(--border-default)] px-6 py-20 md:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="type-subheading text-[var(--text-accent)]">Invite-only trial · Market Pulse</div>
          <h1 className="font-serif-display mt-4 text-[40px] leading-[1.05] tracking-tight text-[var(--text-primary)] md:text-[56px]">
            Where the market&rsquo;s attention is today.
          </h1>
          <p className="mt-6 max-w-2xl type-body text-[17px] leading-8 text-[var(--text-secondary)]">
            A daily read on Indian (NSE/BSE) stock market sentiment, price movement, and technicals -
            built for business owners thinking about where surplus cash might go. This trial gives you
            the exact same dashboard our paying customers use, in full, for a limited number of days.
          </p>
        </div>
      </section>

      <section className="border-b border-[var(--border-default)] px-6 py-14">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
              <f.icon className="h-5 w-5 text-[var(--gold-base)]" />
              <div className="mt-3 type-heading text-[var(--text-primary)]">{f.title}</div>
              <p className="mt-1.5 type-caption text-[var(--text-tertiary)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <Suspense fallback={null}>
            <MarketPulseTrialGate />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
