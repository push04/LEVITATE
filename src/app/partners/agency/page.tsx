'use client';

import Link from 'next/link';
import { useState } from 'react';



export default function AgencyPage() {
    return (
        <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <section className="mx-auto max-w-4xl px-4 pt-24 pb-12 sm:px-6 sm:pt-32 text-center">
                <h1 className="font-headline text-[clamp(2rem,7vw,3.5rem)] leading-[1.1] text-[var(--text-primary)]">
                    White-Label Our Platform.<br /><span className="text-[var(--gold-base)]">Offer AI Automation to Your Clients.</span><br />Keep the Margin.
                </h1>
                <p className="mt-4 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">Resell LevitateOS to your clients under your own brand. We handle the tech, you keep the margin.</p>
                <Link href="#apply" className="mt-8 inline-flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-8 py-4 text-base font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3)] transition-all duration-150 hover:brightness-105">
                    Apply as Agency Partner
                </Link>
            </section>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <div className="grid gap-6 sm:grid-cols-3">
                    {[
                        { title: 'White-Label Access', desc: 'Get full access to our platform with your branding. Your clients see your logo, not ours.' },
                        { title: 'You Handle the Client', desc: 'Manage client relationships directly. We provide the backend automation and support.' },
                        { title: 'Keep the Margin', desc: 'Charge clients ₹15,000–25,000/month. Keep everything above our ₹12,999 base rate.' },
                    ].map(f => (
                        <div key={f.title} className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
                            <h3 className="text-sm font-semibold text-[var(--gold-base)]">{f.title}</h3>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <h2 className="text-xl font-semibold mb-8 text-center">How it works</h2>
                <div className="grid gap-6">
                    {[
                        { step: 1, title: 'Apply & Get Approved', desc: 'Fill out the agency application form. We review and approve qualified agencies.' },
                        { step: 2, title: 'White-Label Setup', desc: 'We set up your branded instance with your logo, colors, and domain.' },
                        { step: 3, title: 'Onboard Your Clients', desc: 'Bring your clients onto the platform. They see your brand, not ours.' },
                        { step: 4, title: 'Set Your Pricing', desc: 'Charge clients ₹15,000–25,000/month. You keep the margin above our base rate.' },
                        { step: 5, title: 'We Handle the Tech', desc: 'Our AI automation runs in the background. You focus on client relationships.' },
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
                <div className="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-8">
                    <h2 className="text-xl font-semibold mb-4">Revenue Calculator</h2>
                    <RevenueCalculator />
                </div>
            </section>

            <section id="apply" className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
                <div className="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-8">
                    <h2 className="text-xl font-semibold mb-6">Agency Application</h2>
                    <ApplicationForm />
                </div>
            </section>
        </main>
    );
}

function RevenueCalculator() {
    const [clients, setClients] = useState(10);
    const baseRate = 12999;
    const minCharge = 15000;
    const maxCharge = 25000;
    const avgCharge = (minCharge + maxCharge) / 2;

    const minRevenue = (minCharge - baseRate) * clients;
    const maxRevenue = (maxCharge - baseRate) * clients;
    const avgRevenue = (avgCharge - baseRate) * clients;

    return (
        <div>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Agency charges clients ₹15,000–25,000/month. LevitateOS base rate is ₹12,999/month. You keep the margin.</p>

            <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">I have {clients} client{clients !== 1 ? 's' : ''}</label>
                <input
                    type="range"
                    min="1"
                    max="50"
                    value={clients}
                    onChange={(e) => setClients(Number(e.target.value))}
                    className="w-full h-2 bg-[var(--border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--gold-base)]"
                />
                <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-1">
                    <span>1</span>
                    <span>50</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 rounded-lg bg-[var(--bg-base)]">
                    <div className="text-xs text-[var(--text-tertiary)] mb-1">Min Revenue</div>
                    <div className="text-lg font-bold text-[var(--gold-base)]">₹{minRevenue.toLocaleString()}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">/month</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-[var(--bg-base)]">
                    <div className="text-xs text-[var(--text-tertiary)] mb-1">Avg Revenue</div>
                    <div className="text-lg font-bold text-[var(--gold-base)]">₹{avgRevenue.toLocaleString()}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">/month</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-[var(--bg-base)]">
                    <div className="text-xs text-[var(--text-tertiary)] mb-1">Max Revenue</div>
                    <div className="text-lg font-bold text-[var(--gold-base)]">₹{maxRevenue.toLocaleString()}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">/month</div>
                </div>
            </div>

            <p className="text-xs text-[var(--text-tertiary)]">Based on charging clients ₹15,000–25,000/month with LevitateOS base rate of ₹12,999/month.</p>
        </div>
    );
}

function ApplicationForm() {
    return (
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); alert('Application submitted! We will contact you soon.'); }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Name *</label>
                    <input type="text" required className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--gold-base)] focus:outline-none" placeholder="Your full name" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Agency Name *</label>
                    <input type="text" required className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--gold-base)] focus:outline-none" placeholder="Your agency name" />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Email *</label>
                    <input type="email" required className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--gold-base)] focus:outline-none" placeholder="you@agency.com" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">City *</label>
                    <input type="text" required className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--gold-base)] focus:outline-none" placeholder="Mumbai" />
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Number of Clients *</label>
                <input type="number" required min="1" className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--gold-base)] focus:outline-none" placeholder="10" />
            </div>
            <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Services Offered *</label>
                <textarea required rows={3} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--gold-base)] focus:outline-none resize-none" placeholder="Web development, SEO, social media management..."></textarea>
            </div>
            <button type="submit" className="mt-2 inline-flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-6 py-3 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3)] transition-all duration-150 hover:brightness-105">
                Submit Application
            </button>
        </form>
    );
}
