'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

const FEATURES = [
  { icon: '🤖', title: '16 AI Agents', desc: 'Lead finder, outreach, proposals, invoices, websites — running 24/7' },
  { icon: '📋', title: 'Full CRM Pipeline', desc: 'Found → Contacted → Responded → Proposal → Converted' },
  { icon: '💬', title: 'WhatsApp Automation', desc: 'Hinglish follow-ups, lead scoring, auto-replies drafted for you' },
  { icon: '🌐', title: 'Website in 24 Hours', desc: 'AI builds and deploys a client site with booking + gallery' },
  { icon: '📊', title: 'Revenue Dashboard', desc: 'Live MRR, pipeline value, conversion rates at a glance' },
  { icon: '🔒', title: 'Zero Risk', desc: '14 days full access. No credit card. No commitment.' },
];

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  scale: 'Scale',
};

export default function TrialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [alreadyOnPlan, setAlreadyOnPlan] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [visible, setVisible] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsLoggedIn(true);
          const { data: company } = await supabase
            .from('companies')
            .select('plan')
            .eq('owner_id', user.id)
            .maybeSingle();
          const plan = company?.plan as string | null;
          if (plan && plan !== 'trial' && plan !== '' && plan !== null) {
            setAlreadyOnPlan(plan);
          }
        }
      } catch {
        // silently ignore auth check errors
      } finally {
        setChecking(false);
      }
    })();

    let i = 0;
    const t = setInterval(() => {
      i++;
      setVisible(i);
      if (i >= FEATURES.length) clearInterval(t);
    }, 140);
    return () => clearInterval(t);
  }, []);

  async function startTrial() {
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/business/login?next=/trial');
        return;
      }
      const res = await fetch('/api/trial/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to start trial');
      router.push('/business/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start trial');
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#06060C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes trialSpin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ width: 36, height: 36, border: '2px solid #C8A96E44', borderTopColor: '#C8A96E', borderRadius: '50%', animation: 'trialSpin 0.75s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#06060C', color: '#E8E8F0', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes trialOrb1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.1)} 66%{transform:translate(-20px,20px) scale(0.95)} }
        @keyframes trialOrb2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,20px) scale(0.9)} 66%{transform:translate(30px,-40px) scale(1.05)} }
        @keyframes trialFadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes trialShimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes trialPulse { 0%,100%{box-shadow:0 0 0 0 #C8A96E44} 50%{box-shadow:0 0 0 8px #C8A96E00} }
        @keyframes trialCheck { from{transform:scale(0) rotate(-30deg);opacity:0} to{transform:scale(1) rotate(0deg);opacity:1} }
        .trial-feature-item { animation: trialFadeUp 0.4s ease both }
        .trial-cta { background: linear-gradient(135deg, #C8A96E, #A07840, #C8A96E); background-size: 200% auto; transition: all 0.25s; }
        .trial-cta:hover { background-position: right center; box-shadow: 0 8px 32px rgba(200,169,110,0.35); transform: translateY(-1px) }
        .trial-cta:disabled { opacity: 0.6; cursor: not-allowed; transform: none }
        .trial-card { background: linear-gradient(135deg, #131320, #0E0E1A); border: 1px solid #2A2A40; border-radius: 20px; }
        .trial-check { animation: trialCheck 0.35s cubic-bezier(0.34,1.56,0.64,1) both }
      `}</style>

      {/* Background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, #C8A96E10 0%, transparent 70%)', animation: 'trialOrb1 12s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, #818cf810 0%, transparent 70%)', animation: 'trialOrb2 15s ease-in-out infinite' }} />
      </div>

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid #1A1A28', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#C8A96E', fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px', textDecoration: 'none' }}>
          LEVITATE
        </Link>
        <Link href="/onboard" style={{ fontSize: 13, color: '#888', textDecoration: 'none', border: '1px solid #2A2A38', borderRadius: 8, padding: '6px 14px', transition: 'all 0.2s' }}>
          See all plans →
        </Link>
      </nav>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '60px 24px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 420px', gap: 60, alignItems: 'start' }}>

        {/* Left: Features */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#C8A96E11', border: '1px solid #C8A96E33', borderRadius: 20, padding: '5px 14px', marginBottom: 28 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C8A96E', animation: 'trialPulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 12, color: '#C8A96E', fontWeight: 600, letterSpacing: '0.6px' }}>FREE TRIAL — NO CARD NEEDED</span>
          </div>

          <h1 style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 20 }}>
            14 days.<br />
            <span style={{ color: '#C8A96E' }}>Zero limits.</span>
          </h1>

          <p style={{ fontSize: 17, color: '#888', lineHeight: 1.65, marginBottom: 44, maxWidth: 480 }}>
            Get the full LEVITATE platform — 16 AI agents, CRM pipeline, WhatsApp automation, and revenue dashboard — completely free for 14 days.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 48 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title}
                className={i < visible ? 'trial-feature-item' : ''}
                style={{ display: 'flex', gap: 14, alignItems: 'flex-start', opacity: i < visible ? 1 : 0, animationDelay: `${i * 0.08}s` }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1A1A28', border: '1px solid #2A2A3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#E0E0EC', marginBottom: 2 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex' }}>
              {['RS', 'PP', 'AS', 'MK'].map((init, i) => (
                <div key={init} style={{ width: 34, height: 34, borderRadius: '50%', background: `hsl(${40 + i * 15}, 60%, 45%)`, border: '2px solid #06060C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', marginLeft: i > 0 ? -10 : 0 }}>
                  {init}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>
              <strong style={{ color: '#C8A96E' }}>500+</strong> businesses already on LEVITATE
            </div>
          </div>
        </div>

        {/* Right: Card */}
        <div>
          <div className="trial-card" style={{ padding: 36 }}>
            {alreadyOnPlan ? (
              // Already on a paid plan
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                  You&apos;re on <span style={{ color: '#C8A96E' }}>{PLAN_LABELS[alreadyOnPlan] ?? alreadyOnPlan}</span>
                </h2>
                <p style={{ fontSize: 14, color: '#666', marginBottom: 28, lineHeight: 1.6 }}>
                  You already have an active paid plan. The free trial is not available once a subscription is active.
                </p>
                <Link href="/business/dashboard" style={{ display: 'block', textAlign: 'center', padding: '14px 24px', borderRadius: 12, background: 'linear-gradient(135deg, #C8A96E, #A07840)', color: '#0A0A10', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                  Open Dashboard →
                </Link>
              </div>
            ) : isLoggedIn ? (
              // Logged in, no paid plan
              <>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 6 }}>Your 14-day free trial includes</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#C8A96E', letterSpacing: '-1px' }}>Everything</div>
                  <div style={{ fontSize: 13, color: '#444', marginTop: 4 }}>All features, all agents, full access</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {['All 16 AI agents active', 'CRM + pipeline + reports', 'WhatsApp & email automation', 'Demo leads pre-loaded', 'Website builder access', 'No credit card required'].map((item, i) => (
                    <div key={item} className={i < visible ? 'trial-check' : ''} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: i < visible ? 1 : 0, animationDelay: `${0.4 + i * 0.08}s` }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#C8A96E22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, color: '#C8A96E' }}>✓</span>
                      </div>
                      <span style={{ fontSize: 13, color: '#999' }}>{item}</span>
                    </div>
                  ))}
                </div>

                {error && (
                  <div style={{ background: '#ff444411', border: '1px solid #ff444433', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8888', marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                <button onClick={startTrial} disabled={loading} className="trial-cta"
                  style={{ width: '100%', padding: '15px 24px', borderRadius: 12, border: 'none', color: '#0A0A10', fontWeight: 700, fontSize: 15, cursor: 'pointer', letterSpacing: '-0.3px' }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <svg style={{ width: 16, height: 16, animation: 'trialSpin 0.75s linear infinite' }} viewBox="0 0 24 24" fill="none">
                        <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Starting your workspace…
                    </span>
                  ) : 'Activate Free Trial →'}
                </button>

                <p style={{ textAlign: 'center', fontSize: 12, color: '#444', marginTop: 14 }}>
                  Trial ends automatically. No charges without your consent.
                </p>
              </>
            ) : (
              // Not logged in
              <>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 6 }}>Sign in to activate your</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#C8A96E', letterSpacing: '-1px' }}>Free 14-Day Trial</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {['All 16 AI agents', 'Full CRM pipeline', 'WhatsApp automation', 'No credit card needed'].map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: '#C8A96E', fontSize: 12 }}>✓</span>
                      <span style={{ fontSize: 13, color: '#888' }}>{item}</span>
                    </div>
                  ))}
                </div>

                <Link href="/business/login?next=/trial"
                  style={{ display: 'block', textAlign: 'center', padding: '15px 24px', borderRadius: 12, background: 'linear-gradient(135deg, #C8A96E, #A07840)', color: '#0A0A10', fontWeight: 700, fontSize: 15, textDecoration: 'none', marginBottom: 12 }}>
                  Sign In to Start Trial
                </Link>
                <Link href="/onboard"
                  style={{ display: 'block', textAlign: 'center', padding: '12px 24px', borderRadius: 12, background: 'transparent', color: '#888', fontSize: 14, textDecoration: 'none', border: '1px solid #2A2A38' }}>
                  New here? Create an account
                </Link>
              </>
            )}
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20 }}>
            {['🔐 Secure', '⚡ Instant setup', '🇮🇳 India-first'].map(t => (
              <span key={t} style={{ fontSize: 12, color: '#444' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          div[style*="grid-template-columns: minmax"] { grid-template-columns: 1fr !important; }
          h1[style*="font-size: 54px"] { font-size: 38px !important; }
        }
        @keyframes trialSpin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
