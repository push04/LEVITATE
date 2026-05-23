'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function TrialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function startTrial() {
    setLoading(true);
    setError('');
    try {
      // Ensure user is authenticated first
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/business/login?next=/trial');
        return;
      }

      // Call the server-side API which correctly uses the `companies` table
      const res = await fetch('/api/trial/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start trial. Please try again.');
      }

      // Trial started — redirect to business dashboard
      router.push('/business/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start trial');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[var(--foreground)] flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-[18px] border border-white/10 bg-white/5 p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-headline text-4xl md:text-5xl">
            <span className="text-[#C8A96E]">Start</span> Free Trial
          </h1>
          <p className="text-[var(--muted)]">14 days, full access, no credit card required.</p>
        </div>

        <ul className="space-y-3 text-sm text-[var(--muted)]">
          {[
            'Full CRM & lead pipeline',
            'WhatsApp & email automation',
            'Agentic AI workflow engine',
            'Demo leads & activity pre-loaded',
            'Deploy in minutes',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="text-[#C8A96E]">✓</span> {item}
            </li>
          ))}
        </ul>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={startTrial}
          disabled={loading}
          className="w-full rounded-[10px] bg-[linear-gradient(135deg,#c9a55a,#a88540)] px-5 py-3.5 text-sm font-semibold text-[#0f0e0b] shadow-[0_4px_16px_rgba(201,165,90,0.3),0_1px_3px_rgba(0,0,0,0.4)] transition-all duration-150 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Setting up your workspace…
            </span>
          ) : (
            'Start Free Trial — No Credit Card'
          )}
        </button>

        <p className="text-center text-xs text-[var(--muted)]">
          Already have an account?{' '}
          <Link href="/business/login" className="text-[#C8A96E] underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
