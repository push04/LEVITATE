import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Your Business Website. Live in 24 Hours. Guaranteed.',
    description: 'AI-powered website building for Indian SMBs. Pay, answer 5 questions, and your site goes live within 24 hours.',
    openGraph: {
        title: 'Your Business Website. Live in 24 Hours. Guaranteed.',
        description: 'AI-powered website building for Indian SMBs. Pay, answer 5 questions, and your site goes live within 24 hours.',
        images: [
            {
                url: 'https://levitatelabs.online/api/og?title=Website%20in%2024%20Hours&type=default',
                width: 1200,
                height: 630,
                alt: 'Website in 24 Hours | LevitateOS',
            },
        ],
    },
};

const websitesDelivered = 847;
const avgDeliveryHours = 18;

export default function Website24Page() {
    return (
        <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <section className="mx-auto max-w-4xl px-4 pt-24 pb-12 sm:px-6 sm:pt-32 text-center">
                <h1 className="font-headline text-[clamp(2rem,7vw,3.5rem)] leading-[1.1] text-[var(--text-primary)]">
                    Your Business Website.<br />Live in <span className="text-[var(--gold-base)]">24 Hours</span>. Guaranteed.
                </h1>
                <p className="mt-4 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">Professional, mobile-responsive, SEO-optimized. Built by AI, reviewed by humans, deployed to your custom URL.</p>
                <Link href="/trial" className="mt-8 inline-flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-8 py-4 text-base font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3)] transition-all duration-150 hover:brightness-105">
                    Order Your Website Now
                </Link>
            </section>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <div className="text-center p-6 rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <div className="text-3xl font-bold text-[var(--gold-base)]">{websitesDelivered.toLocaleString()}+</div>
                        <div className="text-xs text-[var(--text-tertiary)] mt-1">Websites Delivered</div>
                    </div>
                    <div className="text-center p-6 rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <div className="text-3xl font-bold text-[var(--gold-base)]">{avgDeliveryHours}</div>
                        <div className="text-xs text-[var(--text-tertiary)] mt-1">Avg. Delivery (Hours)</div>
                    </div>
                    <div className="text-center p-6 rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <div className="text-3xl font-bold text-[var(--gold-base)]">100%</div>
                        <div className="text-xs text-[var(--text-tertiary)] mt-1">Mobile Responsive</div>
                    </div>
                    <div className="text-center p-6 rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <div className="text-3xl font-bold text-[var(--gold-base)]">24h</div>
                        <div className="text-xs text-[var(--text-tertiary)] mt-1">Guaranteed Delivery</div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
                <h2 className="text-xl font-semibold mb-8 text-center">How it works</h2>
                <div className="grid gap-6">
                    {[
                        { step: 1, title: 'Pay', desc: 'Choose your plan. Website deployment is included in your subscription.' },
                        { step: 2, title: 'Answer 5 Questions', desc: 'Business name, city, category, preferred colors, and key services.' },
                        { step: 3, title: 'AI Builds Your Site', desc: 'Our AI generates a complete website with mobile-first design and local SEO.' },
                        { step: 4, title: 'You Review', desc: 'Preview the site, request changes, and approve when ready.' },
                        { step: 5, title: 'Live', desc: 'Your website goes live on your branded URL. Average delivery: 18 hours.' },
                    ].map(s => (
                        <div key={s.step} className="flex gap-4 items-start rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--gold-base)] text-sm font-bold text-[var(--text-inverse)]">{s.step}</div>
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
                    <div className="text-sm uppercase tracking-[0.2em] text-[var(--gold-base)] mb-2">24-Hour Guarantee</div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">If your website isn&apos;t live within 24 hours of design approval, we refund your first month.</h2>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">No questions asked.</p>
                </div>
            </section>

            <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
                <h2 className="text-xl font-semibold mb-6">Frequently asked questions</h2>
                <div className="grid gap-4">
                    {[
                        { q: 'What kind of website do I get?', a: 'A professional, mobile-responsive static website with SEO optimization, WhatsApp integration, Google Maps, and your brand colors.' },
                        { q: 'Can I make changes after it goes live?', a: 'Yes. Request changes from your dashboard and AI regenerates the updated version within hours.' },
                        { q: 'Do I get hosting?', a: 'Yes. Your website is deployed on Netlify with a custom URL like your-business.levitatelabs.online.' },
                        { q: 'What if I want my own domain?', a: 'Custom domain support is coming soon. Join the waitlist from your dashboard.' },
                        { q: 'How many pages?', a: 'Standard package includes: Home, About, Services, Contact. Additional pages available on request.' },
                        { q: 'Is SEO included?', a: 'Yes. Every site ships with meta tags, structured data, sitemap, and local SEO optimization for your city.' },
                    ].map(faq => (
                        <div key={faq.q} className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{faq.q}</h3>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:hidden">
                <Link href="/trial" className="flex w-full items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-5 py-3.5 text-sm font-semibold text-[var(--text-inverse)]">
                    Order your website now
                </Link>
            </div>
        </main>
    );
}
