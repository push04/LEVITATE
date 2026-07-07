import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, LineChart, ShieldCheck, Sparkles } from 'lucide-react';
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

      <section className="border-b border-[var(--border-default)] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <Suspense fallback={null}>
            <MarketPulseTrialGate />
          </Suspense>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-serif-display text-[28px] text-[var(--text-primary)] md:text-[34px]">
            Don&rsquo;t have an invite code?
          </h2>
          <p className="mx-auto mt-3 max-w-xl type-body text-[var(--text-secondary)]">
            Market Pulse trials are handed out one business at a time. Email us and we&rsquo;ll set you
            up with a code, or explore what else Levitate Labs builds.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:pushpal@levitatelabs.online"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-6 py-3 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(176,141,87,0.3)] transition-transform hover:-translate-y-px"
            >
              Email pushpal@levitatelabs.online
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/tools/bizharvest"
              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-overlay)]"
            >
              Try the BizHarvest demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/tools/tenderpulse"
              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-overlay)]"
            >
              Try the TenderPulse demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
