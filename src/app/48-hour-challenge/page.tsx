import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: '48-Hour Challenge — Give Us 48 Hours',
    description: 'We\'ll set up your CRM, find your first 20 leads, and send your first automated outreach — all done for you.',
    openGraph: {
        title: '48-Hour Challenge — Give Us 48 Hours',
        description: 'We\'ll set up your CRM, find your first 20 leads, and send your first automated outreach — all done for you.',
        images: [
            {
                url: 'https://levitatelabs.online/api/og?title=48-Hour%20Challenge&type=default',
                width: 1200,
                height: 630,
                alt: '48-Hour Challenge | LevitateOS',
            },
        ],
    },
};

export default function ChallengePage() {
    return (
        <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <section className="mx-auto max-w-3xl px-4 pt-24 pb-12 sm:px-6 sm:pt-32 text-center">
                <h1 className="font-headline text-[clamp(2.5rem,8vw,5rem)] leading-[1.05] text-[var(--text-primary)]">
                    Give us <span className="text-[var(--gold-base)]">48 hours</span>.
                </h1>
                <p className="mt-4 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                    We&apos;ll set up your CRM, find your first 20 leads, and send your first automated outreach — all done for you.
                </p>
                <Link href="/trial" className="mt-8 inline-flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-8 py-4 text-base font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3)] transition-all duration-150 hover:brightness-105">
                    Accept the 48-hour challenge → Start free trial
                </Link>
            </section>

            <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
                <div className="grid gap-6">
                    {[
                        { time: 'Hour 0–2', title: 'Workspace Configured', desc: 'Your CRM is set up with your business details, city, and category. Pipeline is live.' },
                        { time: 'Hour 2–8', title: '20 Leads Found', desc: 'BizDev Agent searches your city for businesses matching your target profile.' },
                        { time: 'Hour 8–24', title: 'Messages Drafted', desc: 'Outreach Agent crafts personalized Hinglish messages for each lead.' },
                        { time: 'Hour 24–48', title: 'First Outreach Sent', desc: 'Messages go out. First responses tracked. Your pipeline is live and working.' },
                    ].map(s => (
                        <div key={s.time} className="flex gap-4 items-start rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
                            <div className="type-mono text-[var(--gold-base)] shrink-0 text-sm">{s.time}</div>
                            <div>
                                <h3 className="font-semibold text-[var(--text-primary)]">{s.title}</h3>
                                <p className="mt-1 text-sm text-[var(--text-secondary)]">{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
                <div className="rounded-[18px] border border-[var(--gold-base)]/30 bg-[var(--gold-glow)] p-8 text-center">
                    <div className="text-sm uppercase tracking-[0.2em] text-[var(--gold-base)] mb-2">48-Hour Guarantee</div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">If you don&apos;t have 20 leads in your pipeline within 48 hours of activation, your first month is free.</h2>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">No questions asked.</p>
                </div>
            </section>

            <section className="mx-auto max-w-2xl px-4 pb-24 sm:px-6 text-center">
                <Link href="/trial" className="inline-flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-8 py-4 text-base font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3)] transition-all duration-150 hover:brightness-105">
                    Accept the 48-hour challenge →
                </Link>
                <p className="mt-6 text-sm text-[var(--text-tertiary)]">
                    <Link href="/" className="text-[var(--gold-base)] hover:underline">Learn more about all features →</Link>
                </p>
            </section>
        </main>
    );
}
