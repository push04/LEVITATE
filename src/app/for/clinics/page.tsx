'use client';

import Link from 'next/link';
import { useEffect } from 'react';



export default function ClinicsPage() {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'page_view', vertical: 'clinics', path: '/for/clinics' }),
            }).catch(() => {});
        }
    }, []);

    const faqs = [
        { q: 'Does this work with my existing appointment system?', a: 'Yes. LevitateOS integrates with any existing tool via WhatsApp and email. No migration needed.' },
        { q: 'Is patient data secure?', a: 'All data is encrypted and stored on Supabase with Row Level Security. We never share patient information.' },
        { q: 'How quickly can I set this up?', a: 'Your workspace is ready in 2 minutes. WhatsApp templates are pre-built for clinics.' },
        { q: 'Can I customize the messages?', a: 'Yes. All message templates are editable from your dashboard. Add your clinic name, doctor details, and tone.' },
        { q: 'What if I have multiple doctors?', a: 'Each doctor can have their own schedule and message templates. Manage everything from one workspace.' },
    ];

    const features = [
        { title: 'WhatsApp Appointment Reminders', desc: 'Auto-send reminders 24h before appointments. Reduce no-shows by up to 40%.' },
        { title: 'Patient Re-engagement', desc: 'Automated follow-ups for patients who haven\'t visited in 60+ days.' },
        { title: 'Google Reviews Automation', desc: 'Happy patients get review requests automatically. Build your online reputation.' },
    ];

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
    };

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-[var(--foreground)]">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

            <section className="mx-auto max-w-4xl px-4 pt-24 pb-12 sm:px-6 sm:pt-32 text-center">
                <h1 className="font-headline text-[clamp(2rem,7vw,3.5rem)] leading-[1.1] text-[var(--foreground)]">
                    Fill Empty Appointment Slots.<br /><span className="text-[#C8A96E]">Reduce No-Shows. Build Your Clinic&apos;s Digital Presence.</span>
                </h1>
                <p className="mt-4 text-lg text-[var(--muted)] max-w-2xl mx-auto">Build your clinic&apos;s digital presence and automate patient communication with WhatsApp-first tools.</p>
                <Link href="/trial" className="mt-8 inline-flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#C8A96E,#a68a4a)] px-8 py-4 text-base font-semibold text-[#0a0a0a] shadow-[0_4px_16px_rgba(200,169,110,0.3)] transition-all duration-150 hover:brightness-105">
                    Start free trial — see how many patients you&apos;re losing per week
                </Link>
            </section>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <div className="grid gap-6 sm:grid-cols-3">
                    {features.map(f => (
                        <div key={f.title} className="rounded-[14px] border border-[#C8A96E]/20 bg-[#111111] p-6">
                            <h3 className="text-sm font-semibold text-[#C8A96E]">{f.title}</h3>
                            <p className="mt-2 text-sm text-[var(--muted)]">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
                <h2 className="text-xl font-semibold mb-6 text-[var(--foreground)]">Frequently asked questions</h2>
                <div className="grid gap-4">
                    {faqs.map(faq => (
                        <div key={faq.q} className="rounded-[14px] border border-[#C8A96E]/20 bg-[#111111] p-5">
                            <h3 className="text-sm font-semibold text-[var(--foreground)]">{faq.q}</h3>
                            <p className="mt-2 text-sm text-[var(--muted)]">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#C8A96E]/20 bg-[#111111] p-4 sm:hidden">
                <Link href="/trial" className="flex w-full items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#C8A96E,#a68a4a)] px-5 py-3.5 text-sm font-semibold text-[#0a0a0a]">
                    Start free trial for clinics
                </Link>
            </div>
        </main>
    );
}
