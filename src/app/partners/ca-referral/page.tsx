'use client';

import Link from 'next/link';
import { useState } from 'react';



export default function CAReferralPage() {
    return (
        <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <section className="mx-auto max-w-4xl px-4 pt-24 pb-12 sm:px-6 sm:pt-32 text-center">
                <h1 className="font-headline text-[clamp(2rem,7vw,3.5rem)] leading-[1.1] text-[var(--text-primary)]">
                    Your SMB Clients Need Digital Tools.<br /><span className="text-[var(--gold-base)]">You Earn When They Subscribe.</span>
                </h1>
                <p className="mt-4 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">Refer your business clients to LevitateOS. Earn 20% of their subscription — every month, as long as they stay.</p>
                <Link href="#signup" className="mt-8 inline-flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-8 py-4 text-base font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3)] transition-all duration-150 hover:brightness-105">
                    Become a CA Partner
                </Link>
            </section>

            <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
                <h2 className="text-xl font-semibold mb-6">Earnings Calculator</h2>
                <div className="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-8">
                    <EarningsCalculator />
                </div>
            </section>

            <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
                <h2 className="text-xl font-semibold mb-6">Example earnings</h2>
                <div className="overflow-x-auto rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)]">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border-default)] text-left text-[var(--text-tertiary)]">
                                <th className="px-6 py-3">Referrals</th>
                                <th className="px-6 py-3">Monthly Commission</th>
                                <th className="px-6 py-3">Annual Earnings</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { referrals: 5, monthly: '₹12,999', annual: '₹1,55,988' },
                                { referrals: 10, monthly: '₹25,998', annual: '₹3,11,976' },
                                { referrals: 20, monthly: '₹51,996', annual: '₹6,23,952' },
                            ].map((row, i) => (
                                <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
                                    <td className="px-6 py-4 font-medium">{row.referrals}</td>
                                    <td className="px-6 py-4 text-[var(--gold-base)]">{row.monthly}</td>
                                    <td className="px-6 py-4">{row.annual}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section id="signup" className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
                <div className="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-8">
                    <h2 className="text-xl font-semibold mb-6">Partner Signup</h2>
                    <SignupForm />
                </div>
            </section>
        </main>
    );
}

function EarningsCalculator() {
    const [referrals, setReferrals] = useState(10);
    const commissionRate = 0.20;
    const avgPlanPrice = 12999;

    const monthlyCommission = referrals * avgPlanPrice * commissionRate;
    const annualEarnings = monthlyCommission * 12;

    return (
        <div>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Earn 20% commission on every client you refer. Commissions are paid monthly as long as your referrals stay subscribed.</p>

            <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">I have referred {referrals} client{referrals !== 1 ? 's' : ''}</label>
                <input
                    type="range"
                    min="1"
                    max="50"
                    value={referrals}
                    onChange={(e) => setReferrals(Number(e.target.value))}
                    className="w-full h-2 bg-[var(--border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--gold-base)]"
                />
                <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-1">
                    <span>1</span>
                    <span>50</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-4 rounded-lg bg-[var(--bg-base)]">
                    <div className="text-xs text-[var(--text-tertiary)] mb-1">Monthly Commission</div>
                    <div className="text-lg font-bold text-[var(--gold-base)]">₹{monthlyCommission.toLocaleString()}</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-[var(--bg-base)]">
                    <div className="text-xs text-[var(--text-tertiary)] mb-1">Annual Earnings</div>
                    <div className="text-lg font-bold text-[var(--gold-base)]">₹{annualEarnings.toLocaleString()}</div>
                </div>
            </div>

            <p className="text-xs text-[var(--text-tertiary)]">Based on 20% commission of ₹12,999 average plan price per referral.</p>
        </div>
    );
}

function SignupForm() {
    return (
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); alert('Signup submitted! We will contact you soon.'); }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Name *</label>
                    <input type="text" required className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--gold-base)] focus:outline-none" placeholder="Your full name" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">CA Firm Name *</label>
                    <input type="text" required className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--gold-base)] focus:outline-none" placeholder="Your CA firm" />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Email *</label>
                    <input type="email" required className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--gold-base)] focus:outline-none" placeholder="you@cafirm.com" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">City *</label>
                    <input type="text" required className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--gold-base)] focus:outline-none" placeholder="Mumbai" />
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Number of SMB Clients *</label>
                <input type="number" required min="1" className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--gold-base)] focus:outline-none" placeholder="20" />
            </div>
            <button type="submit" className="mt-2 inline-flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-6 py-3 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3)] transition-all duration-150 hover:brightness-105">
                Join as CA Partner
            </button>
        </form>
    );
}
