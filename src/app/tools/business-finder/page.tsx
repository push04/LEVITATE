'use client';

import { useState } from 'react';
import Link from 'next/link';

const CITIES = ['Vadodara', 'Surat', 'Ahmedabad', 'Rajkot', 'Gandhinagar', 'Anand', 'Nadiad', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Navsari', 'Vapi', 'Bharuch', 'Mehsana', 'Gandhidham', 'Morbi', 'Patan', 'Palanpur', 'Porbandar', 'Valsad', 'Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Allahabad', 'Ranchi', 'Howrah'];
const CATEGORIES = ['Restaurant', 'Clinic', 'Coaching Centre', 'Real Estate', 'Salon', 'Gym', 'CA/Accountant', 'Retailer', 'Other'];

const MOCK_RESULTS = [
    { name: 'Shreeji Restaurant', category: 'Restaurant', hasWebsite: false, rating: 4.2, lastReview: '2025-12-15', score: 32 },
    { name: 'City Dental Clinic', category: 'Clinic', hasWebsite: true, rating: 4.6, lastReview: '2026-03-20', score: 65 },
    { name: 'Excel Coaching Centre', category: 'Coaching Centre', hasWebsite: false, rating: 3.8, lastReview: '2025-08-10', score: 22 },
    { name: 'Prime Properties', category: 'Real Estate', hasWebsite: true, rating: 4.1, lastReview: '2026-01-05', score: 58 },
    { name: 'Glamour Salon', category: 'Salon', hasWebsite: false, rating: 4.5, lastReview: '2026-04-01', score: 45 },
    { name: 'FitLife Gym', category: 'Gym', hasWebsite: true, rating: 4.0, lastReview: '2026-02-28', score: 72 },
    { name: 'Shah & Associates CA', category: 'CA/Accountant', hasWebsite: false, rating: 4.8, lastReview: '2026-04-10', score: 38 },
    { name: 'Daily Mart', category: 'Retailer', hasWebsite: false, rating: 3.5, lastReview: '2025-06-20', score: 18 },
];

export default function BusinessFinderPage() {
    const [city, setCity] = useState('');
    const [category, setCategory] = useState('');
    const [results, setResults] = useState<typeof MOCK_RESULTS | null>(null);
    const [loading, setLoading] = useState(false);
    const [emailModal, setEmailModal] = useState(false);
    const [email, setEmail] = useState('');
    const [selectedBiz, setSelectedBiz] = useState<string | null>(null);

    const handleSearch = () => {
        if (!city || !category) return;
        setLoading(true);
        setTimeout(() => {
            setResults(MOCK_RESULTS.map(r => ({ ...r, score: Math.min(100, r.score + Math.floor(Math.random() * 20 - 10)) })));
            setLoading(false);
        }, 1200);
    };

    const handleAudit = (bizName: string) => {
        setSelectedBiz(bizName);
        setEmailModal(true);
    };

    const submitEmail = () => {
        if (!email) return;
        setEmailModal(false);
    };

    const getScoreColor = (s: number) => s >= 70 ? 'text-emerald-400' : s >= 40 ? 'text-amber-400' : 'text-rose-400';
    const getScoreBg = (s: number) => s >= 70 ? 'bg-emerald-500/15 border-emerald-500/20' : s >= 40 ? 'bg-amber-500/15 border-amber-500/20' : 'bg-rose-500/15 border-rose-500/20';

    const handleShareWhatsApp = (biz: typeof MOCK_RESULTS[0]) => {
        const text = `Check out ${biz.name} - Digital Score: ${biz.score}/100. Find more businesses at`;
        const url = typeof window !== 'undefined' ? window.location.href : '';
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
        window.open(whatsappUrl, '_blank');
        trackShareEvent(biz.name, 'whatsapp');
    };

    const handleShareLinkedIn = (biz: typeof MOCK_RESULTS[0]) => {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        const text = `Check out ${biz.name} - Digital Score: ${biz.score}/100`;
        const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`;
        window.open(linkedInUrl, '_blank');
        trackShareEvent(biz.name, 'linkedin');
    };

    const handleCopyLink = async (biz: typeof MOCK_RESULTS[0]) => {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        try {
            await navigator.clipboard.writeText(url);
            alert('Link copied to clipboard!');
            trackShareEvent(biz.name, 'copy_link');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const trackShareEvent = async (businessName: string, platform: string) => {
        try {
            await fetch('/api/conversion-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_type: 'business_finder_shared',
                    metadata: {
                        business_name: businessName,
                        platform: platform,
                        tool: 'business-finder'
                    }
                })
            });
        } catch (err) {
            console.error('Failed to track event:', err);
        }
    };

    return (
        <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <section className="mx-auto max-w-4xl px-4 pt-24 pb-8 sm:px-6 sm:pt-32 text-center">
                <h1 className="font-headline text-[clamp(1.75rem,6vw,3rem)] leading-[1.1] text-[var(--text-primary)]">
                    Find Digital Gaps in <span className="text-[var(--gold-base)]">Your City</span>
                </h1>
                <p className="mt-3 text-base text-[var(--text-secondary)] max-w-xl mx-auto">Search any business in any Indian city. See their digital presence score — for free.</p>
            </section>

            <section className="mx-auto max-w-3xl px-4 pb-12 sm:px-6">
                <div className="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
                    <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
                        <div>
                            <label className="mb-1 block text-xs text-[var(--text-tertiary)]">City</label>
                            <select value={city} onChange={e => setCity(e.target.value)} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--gold-base)]">
                                <option value="">Select city</option>
                                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-[var(--text-tertiary)]">Category</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--gold-base)]">
                                <option value="">Select category</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button onClick={handleSearch} disabled={loading || !city || !category} className="w-full sm:w-auto rounded-xl bg-[var(--gold-base)] px-6 py-3 text-sm font-semibold text-[var(--text-inverse)] disabled:opacity-50 hover:brightness-105 transition-all">
                                {loading ? 'Searching...' : 'Search'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {results && (
                <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                    <div className="overflow-x-auto rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <table className="w-full min-w-[600px] text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border-default)] text-left text-[var(--text-tertiary)]">
                                    <th className="px-4 py-3 font-medium">Business</th>
                                    <th className="px-4 py-3 font-medium">Category</th>
                                    <th className="px-4 py-3 font-medium">Website</th>
                                    <th className="px-4 py-3 font-medium">Rating</th>
                                    <th className="px-4 py-3 font-medium">Digital Score</th>
                                    <th className="px-4 py-3 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((r, i) => (
                                    <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
                                        <td className="px-4 py-3 font-medium">{r.name}</td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)]">{r.category}</td>
                                        <td className="px-4 py-3">{r.hasWebsite ? <span className="text-emerald-400">Yes</span> : <span className="text-rose-400">No</span>}</td>
                                        <td className="px-4 py-3">{r.rating}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getScoreBg(r.score)} ${getScoreColor(r.score)}`}>{r.score}/100</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => handleAudit(r.name)} className="text-xs text-[var(--gold-base)] hover:underline">See full audit</button>
                                                <button onClick={() => handleShareWhatsApp(r)} className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="Share on WhatsApp">
                                                    WA
                                                </button>
                                                <button onClick={() => handleShareLinkedIn(r)} className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Share on LinkedIn">
                                                    LI
                                                </button>
                                                <button onClick={() => handleCopyLink(r)} className="text-xs px-2 py-1 rounded bg-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors" title="Copy link">
                                                    Copy
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {emailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="w-full max-w-md rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Full Digital Audit: {selectedBiz}</h3>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">Enter your email to see the complete breakdown.</p>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="mt-4 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--gold-base)]" />
                        <div className="mt-4 flex gap-3">
                            <button onClick={() => setEmailModal(false)} className="flex-1 rounded-xl border border-[var(--border-default)] px-4 py-3 text-sm text-[var(--text-secondary)]">Cancel</button>
                            <button onClick={submitEmail} className="flex-1 rounded-xl bg-[var(--gold-base)] px-4 py-3 text-sm font-semibold text-[var(--text-inverse)] hover:brightness-105">Get Audit</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
