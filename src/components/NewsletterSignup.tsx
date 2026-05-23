'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface NewsletterSignupProps {
  source: string;
  heading?: string;
  subheading?: string;
}

export default function NewsletterSignup({
  source,
  heading = 'Get weekly automation tips for Indian SMBs',
  subheading,
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === 'loading') return;

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('success');
        setMessage(data.message || 'Confirmation email sent!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please check your connection.');
    }
  };

  return (
    <div className="w-full max-w-xl">
      <div className="text-center mb-4">
        <h3 className="text-lg md:text-xl font-semibold text-[var(--foreground)] mb-1">
          {heading}
        </h3>
        {subheading && (
          <p className="text-sm text-[var(--muted)]">{subheading}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full rounded-[10px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[#C8A96E]/50 focus:outline-none focus:ring-1 focus:ring-[#C8A96E]/50 transition-colors"
            disabled={status === 'loading' || status === 'success'}
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="inline-flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-6 py-3 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3)] transition-all duration-150 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Subscribing...
            </>
          ) : status === 'success' ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Subscribed!
            </>
          ) : (
            'Subscribe'
          )}
        </button>
      </form>

      {status === 'error' && (
        <div className="flex items-center gap-2 mt-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-2 mt-3 text-sm text-green-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
