'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { KeyRound, Loader2 } from 'lucide-react';
import MarketPulseWorkspace from '@/components/business/MarketPulseWorkspace';

const CODE_STORAGE_KEY = 'levitate_market_pulse_trial_code';

// Invite-only gate for the Market Pulse trial - no public page involved.
// Once a valid market_pulse invite is redeemed, renders the exact same
// MarketPulseWorkspace the paid business dashboard uses, just pointed at
// the invite-gated public trial routes instead of the paid ones.
export default function MarketPulseTrialGate() {
  const searchParams = useSearchParams();
  const [initializing, setInitializing] = useState(true);
  const [code, setCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState('');

  const redeem = async (candidate: string) => {
    if (!candidate.trim()) return;
    setGateLoading(true);
    setGateError('');
    try {
      const res = await fetch('/api/public/demo-invite/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: candidate }),
      });
      const data = await res.json();
      if (!data.valid) {
        setGateError(data.error ?? 'Invalid invite code');
        return;
      }
      if (data.tool !== 'market_pulse') {
        setGateError('That code is for a different demo - check your invite link.');
        return;
      }
      setCode(data.code);
      try {
        sessionStorage.setItem(CODE_STORAGE_KEY, data.code);
      } catch {
        /* non-fatal */
      }
    } catch {
      setGateError('Could not reach the server - try again.');
    } finally {
      setGateLoading(false);
    }
  };

  useEffect(() => {
    const fromUrl = searchParams.get('invite');
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(CODE_STORAGE_KEY);
    } catch {
      /* non-fatal */
    }
    const candidate = fromUrl || saved;
    if (!candidate) {
      setInitializing(false);
      return;
    }
    void (async () => {
      await redeem(candidate);
      setInitializing(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (initializing) {
    return (
      <div className="mx-auto max-w-md rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--gold-base)]" />
        <p className="mt-3 type-body text-[var(--text-secondary)]">Loading your trial...</p>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="mx-auto max-w-md rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 text-center">
        <KeyRound className="mx-auto h-8 w-8 text-[var(--gold-base)]" />
        <p className="mt-3 type-heading text-[var(--text-primary)]">Enter your trial invite code</p>
        <p className="mt-1.5 type-body text-[var(--text-secondary)]">
          Market Pulse is invite-only right now. Don&rsquo;t have a code? Email{' '}
          <a href="mailto:pushpal@levitatelabs.online" className="text-[var(--gold-base)] hover:underline">
            pushpal@levitatelabs.online
          </a>{' '}
          for one.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void redeem(codeInput);
          }}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="e.g. ABCD1234"
            // text-[16px] (not the design system's smaller type-body) is
            // deliberate - anything under 16px makes iOS Safari auto-zoom
            // the viewport on focus, which is jarring on a code-entry field.
            className="flex-1 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-3 text-center text-[16px] uppercase tracking-wider text-[var(--text-primary)] outline-none focus:border-[var(--gold-base)]"
          />
          <button
            type="submit"
            disabled={gateLoading || !codeInput.trim()}
            className="rounded-[8px] bg-[var(--gold-base)] px-5 py-3 type-body font-semibold text-[var(--text-inverse)] disabled:opacity-50"
          >
            {gateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
          </button>
        </form>
        {gateError && <p className="mt-2 type-caption text-[#c97a7a]">{gateError}</p>}
      </div>
    );
  }

  return (
    <MarketPulseWorkspace
      apiEndpoint="/api/public/market-pulse-trial"
      priceEndpoint="/api/public/market-pulse-trial/prices"
      trialCode={code}
    />
  );
}
