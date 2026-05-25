'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DBPlan {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  monthly_price: number;
  annual_price: number;
  features: string[] | null;
  highlights: string[] | null;
  is_featured: boolean;
  cta_label: string;
  sort_order: number;
}


// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'Restaurant', icon: '🍽️' },
  { id: 'Clinic', icon: '🏥' },
  { id: 'Coaching Centre', icon: '📚' },
  { id: 'Real Estate', icon: '🏗️' },
  { id: 'Salon', icon: '✂️' },
  { id: 'Gym', icon: '💪' },
  { id: 'Retailer', icon: '🛒' },
  { id: 'E-commerce', icon: '📦' },
  { id: 'Consultancy', icon: '💼' },
  { id: 'CA/Accountant', icon: '📊' },
  { id: 'Manufacturer', icon: '🏭' },
  { id: 'Other', icon: '⚡' },
];

const FALLBACK_PLANS: DBPlan[] = [
  { id: '', slug: 'starter', name: 'Starter', tagline: 'For growing businesses', description: null, monthly_price: 12999, annual_price: 10999 * 12, features: ['All 16 AI agents', 'CRM & lead pipeline', 'Outreach automation', 'Proposal generator', 'Website deployment', 'Email support'], highlights: null, is_featured: false, cta_label: 'Choose Starter', sort_order: 1 },
  { id: '', slug: 'growth', name: 'Growth', tagline: 'For scaling teams', description: null, monthly_price: 24999, annual_price: 20999 * 12, features: ['Everything in Starter', 'Custom workflows', 'Advanced analytics', '5 client seats', 'Priority support', 'API access'], highlights: null, is_featured: true, cta_label: 'Choose Growth', sort_order: 2 },
  { id: '', slug: 'scale', name: 'Scale', tagline: 'For agencies', description: null, monthly_price: 49999, annual_price: 41999 * 12, features: ['Everything in Growth', 'White-label branding', 'Reseller program', 'Unlimited seats', 'Dedicated support', 'SLA guarantee'], highlights: null, is_featured: false, cta_label: 'Contact Sales', sort_order: 3 },
];

// ─── Helper ───────────────────────────────────────────────────────────────────
function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

function pwdStrength(p: string): { score: number; label: string; color: string } {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const map = [
    { label: 'Too short', color: '#555' },
    { label: 'Weak', color: '#f87171' },
    { label: 'Fair', color: '#f59e0b' },
    { label: 'Good', color: '#C8A96E' },
    { label: 'Strong', color: '#4ade80' },
    { label: 'Very strong', color: '#22c55e' },
  ];
  return { score, ...map[score] };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Onboard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [plans, setPlans] = useState<DBPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [couponOpen, setCouponOpen] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [couponValid, setCouponValid] = useState<null | boolean>(null);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState('growth');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const rzpScriptRef = useRef(false);

  // ─── Auth state ───────────────────────────────────────────────────────────
  const [authUser, setAuthUser] = useState<{ name: string; email: string; plan: string | null } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // ─── Form state ──────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [bizName, setBizName] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');

  // ─── Auth check ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: company } = await supabase.from('companies').select('plan').eq('owner_id', user.id).maybeSingle();
          const name = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'there';
          setAuthUser({ name, email: user.email ?? '', plan: (company?.plan as string | null) ?? null });
          setEmail(user.email ?? '');
          setFullName(user.user_metadata?.full_name ?? '');
        }
      } finally {
        setAuthChecking(false);
      }
    })();
  }, []);

  // ─── Load Razorpay script ─────────────────────────────────────────────────
  useEffect(() => {
    if (rzpScriptRef.current) return;
    rzpScriptRef.current = true;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.head.appendChild(script);
  }, []);

  // ─── Load plans ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/onboard/plans');
        const data = await res.json();
        if (data.success && Array.isArray(data.plans) && data.plans.length > 0) {
          setPlans(data.plans as DBPlan[]);
          const featured = data.plans.find((p: DBPlan) => p.is_featured);
          if (featured) setSelectedPlanSlug(featured.slug);
        } else {
          setPlans(FALLBACK_PLANS);
        }
      } catch {
        setPlans(FALLBACK_PLANS);
      } finally {
        setPlansLoading(false);
      }
    })();
  }, []);

  const activePlan = plans.find(p => p.slug === selectedPlanSlug) ?? plans[0];
  const planPrice = activePlan ? (billingCycle === 'annual' ? Math.round(activePlan.annual_price / 12) : activePlan.monthly_price) : 0;
  const workspaceSlug = slugify(bizName) || 'your-company';
  const pwdInfo = pwdStrength(password);

  // ─── Step 1: Account ──────────────────────────────────────────────────────
  async function handleAccount(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (signUpError) {
        const msg = signUpError.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('user already exists') || msg.includes('already been registered')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw new Error('Incorrect password for this email.');
        } else {
          throw new Error(signUpError.message);
        }
      }
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Account setup failed.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Step 2: Business ─────────────────────────────────────────────────────
  function handleBusiness(e: React.FormEvent) {
    e.preventDefault();
    if (!bizName.trim() || !city.trim() || !category) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setStep(3);
  }

  // ─── Step 3: Plan → Step 4 ────────────────────────────────────────────────
  function handlePlanNext() {
    setError('');
    setStep(4);
  }

  // ─── Step 4: Launch ───────────────────────────────────────────────────────
  const handleLaunch = useCallback(async () => {
    setLoading(true);
    setPaymentLoading(false);
    setError('');

    try {
      if (selectedPlanSlug === 'trial' || !activePlan?.id) {
        // Trial flow
        const res = await fetch('/api/trial/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName: bizName || undefined }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to start trial');
        router.push('/business/dashboard');
        return;
      }

      if (selectedPlanSlug === 'scale') {
        router.push('/#contact');
        return;
      }

      // Paid plan: checkout + Razorpay
      if (!razorpayLoaded || !window.Razorpay) throw new Error('Payment SDK not loaded. Please refresh the page.');

      const checkoutRes = await fetch('/api/onboard/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: activePlan.id,
          billingCycle,
          companyName: bizName,
          ownerName: fullName,
          phone: phone || undefined,
          couponCode: coupon || undefined,
        }),
      });
      const checkoutData = await checkoutRes.json();

      if (!checkoutRes.ok || !checkoutData.success) {
        if (checkoutData.contactUrl) { router.push(checkoutData.contactUrl); return; }
        throw new Error(checkoutData.error || 'Checkout failed');
      }

      const { keyId, subscriptionId, workspaceSlug: wsSlug, pricing } = checkoutData;

      setLoading(false);
      setPaymentLoading(true);

      const rzp = new window.Razorpay({
        key: keyId,
        subscription_id: subscriptionId,
        name: 'LEVITATE',
        description: `${activePlan.name} — ${billingCycle}`,
        prefill: { name: fullName, email, contact: phone },
        notes: { company_name: bizName, plan: activePlan.slug },
        theme: { color: '#C8A96E' },
        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
            setError('Payment was cancelled. You can try again.');
          },
        },
        handler: async (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => {
          try {
            const verifyRes = await fetch('/api/onboard/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) throw new Error(verifyData.error || 'Verification failed');
            const finalAmount = (pricing as { finalAmount?: number } | null)?.finalAmount ?? planPrice;
            router.push(
              `/onboard/success?company=${encodeURIComponent(bizName)}&workspace=${wsSlug}&amount=${finalAmount}&dashboard=${encodeURIComponent((verifyData as { dashboardUrl?: string }).dashboardUrl || '/business/dashboard?onboard=success')}`
            );
          } catch (err: unknown) {
            setPaymentLoading(false);
            setError(err instanceof Error ? err.message : 'Payment verification failed. Contact support.');
          }
        },
      });
      rzp.open();

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
      setPaymentLoading(false);
    }
  }, [selectedPlanSlug, activePlan, bizName, fullName, email, phone, coupon, billingCycle, planPrice, razorpayLoaded, router]);

  const STEPS = ['Account', 'Business', 'Plan', 'Launch'];
  const isTrialSelected = selectedPlanSlug === 'trial' || !activePlan?.id;

  const PAID_PLANS = ['starter', 'growth', 'scale'];

  if (authChecking) return (
    <div style={{ minHeight: '100vh', background: '#08080E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #2A2A3A', borderTopColor: '#C8A96E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (authUser) {
    const hasPaidPlan = authUser.plan && PAID_PLANS.includes(authUser.plan);
    return (
      <div style={{ minHeight: '100vh', background: '#08080E', color: '#E0E0EC', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
        <style>{`@keyframes ob-fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes ob-orb1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-20px) scale(1.06)}} @keyframes ob-orb2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-40px,30px) scale(0.96)}}`}</style>
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, #C8A96E08 0%, transparent 65%)', animation: 'ob-orb1 14s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, #818cf808 0%, transparent 65%)', animation: 'ob-orb2 18s ease-in-out infinite' }} />
        </div>
        <nav style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid #141420', padding: '16px 24px' }}>
          <Link href="/" style={{ color: '#C8A96E', fontWeight: 800, fontSize: 18 }}>LEVITATE</Link>
        </nav>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>👋</div>
            <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, letterSpacing: '-1px' }}>
              Hi, {authUser.name.split(' ')[0]}
            </h1>
            <p style={{ color: '#666', fontSize: 15, marginBottom: 40 }}>{authUser.email}</p>

            {hasPaidPlan ? (
              <>
                <div style={{ background: '#0E0E1A', border: '1px solid #C8A96E44', borderRadius: 16, padding: '24px 28px', marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>✦</span>
                    <span style={{ color: '#C8A96E', fontWeight: 700, fontSize: 15, textTransform: 'capitalize' }}>{authUser.plan} Plan — Active</span>
                  </div>
                  <p style={{ color: '#555', fontSize: 13, margin: 0 }}>Your workspace is ready. Head to the dashboard to continue.</p>
                </div>
                <button onClick={() => router.push('/business/dashboard')} className="ob-btn-primary" style={{ padding: '15px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#C8A96E,#A07840,#C8A96E)', backgroundSize: '200% auto', color: '#0A0A10', fontWeight: 700, fontSize: 15, cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
                  Go to Dashboard →
                </button>
              </>
            ) : (
              <>
                <div style={{ background: '#0E0E1A', border: '1px solid #2A2A3A', borderRadius: 16, padding: '24px 28px', marginBottom: 24 }}>
                  <p style={{ color: '#888', fontSize: 14, margin: 0 }}>
                    {authUser.plan === 'trial' ? "You're on a free trial. Upgrade to unlock all features." : "Looks like you haven't set up your workspace yet. Pick up where you left off."}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button onClick={() => { setStep(2); setAuthUser(null); }} style={{ padding: '15px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#C8A96E,#A07840,#C8A96E)', backgroundSize: '200% auto', color: '#0A0A10', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {authUser.plan === 'trial' ? 'Upgrade Plan →' : 'Continue Setup →'}
                  </button>
                  <button onClick={() => router.push('/business/dashboard')} style={{ padding: '14px 20px', borderRadius: 10, border: '1px solid #2A2A3A', background: 'transparent', color: '#888', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Go to Dashboard
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08080E', color: '#E0E0EC', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes ob-orb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.06)} }
        @keyframes ob-orb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-40px,30px) scale(0.96)} }
        @keyframes ob-fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ob-spin { to{transform:rotate(360deg)} }
        @keyframes ob-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes ob-glow { 0%,100%{box-shadow:0 0 0 0 #C8A96E33} 50%{box-shadow:0 0 0 6px #C8A96E00} }
        @keyframes ob-pop { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        .ob-input { width:100%; padding:14px 16px; background:#0E0E1A; border:1px solid #2A2A3A; border-radius:10px; color:#E0E0EC; font-size:14px; font-family:inherit; outline:none; transition:border-color 0.2s; }
        .ob-input::placeholder { color:#444 }
        .ob-input:focus { border-color:#C8A96E88 }
        .ob-label { font-size:11px; font-weight:700; color:#555; letter-spacing:0.7px; text-transform:uppercase; margin-bottom:8px; display:block }
        .ob-btn-primary { width:100%; padding:15px 24px; border-radius:12px; border:none; background:linear-gradient(135deg,#C8A96E,#A07840,#C8A96E); background-size:200% auto; color:#0A0A10; font-weight:700; font-size:15px; cursor:pointer; transition:all 0.25s; font-family:inherit; animation:ob-shimmer 3s linear infinite; }
        .ob-btn-primary:hover { background-position:right center; transform:translateY(-1px); box-shadow:0 8px 28px rgba(200,169,110,0.3) }
        .ob-btn-primary:disabled { opacity:0.6; cursor:not-allowed; transform:none }
        .ob-btn-secondary { padding:14px 20px; border-radius:10px; border:1px solid #2A2A3A; background:transparent; color:#888; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:inherit }
        .ob-btn-secondary:hover { border-color:#C8A96E55; color:#E0E0EC }
        .ob-plan-card { background:#0E0E1A; border:1px solid #2A2A3A; border-radius:16px; padding:24px; cursor:pointer; transition:all 0.2s; position:relative }
        .ob-plan-card:hover { border-color:#C8A96E44; transform:translateY(-2px) }
        .ob-plan-selected { border-color:#C8A96E !important; background:#13131F !important; box-shadow:0 0 0 1px #C8A96E44 }
        .ob-cat-card { padding:14px 12px; border-radius:10px; border:1px solid #1E1E2E; background:#0E0E1A; cursor:pointer; text-align:center; transition:all 0.18s; font-family:inherit; color:#E0E0EC }
        .ob-cat-card:hover { border-color:#C8A96E44; background:#131320 }
        .ob-cat-selected { border-color:#C8A96E !important; background:#131320 !important; animation:ob-pop 0.25s cubic-bezier(0.34,1.56,0.64,1) }
        .ob-summary-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #141420; font-size:14px }
        a { text-decoration:none }
        select.ob-input { appearance:none }
      `}</style>

      {/* Animated background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, #C8A96E08 0%, transparent 65%)', animation: 'ob-orb1 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, #818cf808 0%, transparent 65%)', animation: 'ob-orb2 18s ease-in-out infinite' }} />
      </div>

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid #141420', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#C8A96E', fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' }}>LEVITATE</Link>
        <div style={{ fontSize: 12, color: '#444' }}>
          Already have an account?{' '}
          <Link href="/business/login?next=/onboard" style={{ color: '#C8A96E', fontWeight: 600 }}>Sign in</Link>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Step progress */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
            {STEPS.map((label, i) => {
              const done = i + 1 < step;
              const active = i + 1 === step;
              return (
                <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    {i > 0 && <div style={{ flex: 1, height: 2, background: done ? '#C8A96E' : '#1E1E2E', transition: 'background 0.5s' }} />}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, transition: 'all 0.3s',
                      background: done ? '#C8A96E' : active ? '#C8A96E22' : '#141420',
                      border: `2px solid ${done ? '#C8A96E' : active ? '#C8A96E' : '#1E1E2E'}`,
                      color: done ? '#0A0A10' : active ? '#C8A96E' : '#444',
                      animation: active ? 'ob-glow 2.5s ease-in-out infinite' : 'none',
                    }}>
                      {done ? '✓' : i + 1}
                    </div>
                    {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: done ? '#C8A96E' : '#1E1E2E', transition: 'background 0.5s' }} />}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: active ? '#C8A96E' : done ? '#888' : '#333', marginTop: 6, letterSpacing: '0.4px' }}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 20, background: '#ff444410', border: '1px solid #ff444430', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#ff9999', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span>⚠</span> {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ── STEP 1: Account ──────────────────────────────────────── */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.28 }}>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 8 }}>Create your account</h1>
                <p style={{ fontSize: 15, color: '#555', lineHeight: 1.5 }}>Your workspace is tied to your account — one account, one workspace.</p>
              </div>
              <form onSubmit={handleAccount} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label className="ob-label">Full Name</label>
                  <input className="ob-input" type="text" required placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div>
                  <label className="ob-label">Email Address</label>
                  <input className="ob-input" type="email" required placeholder="you@yourbusiness.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="ob-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="ob-input" type={showPwd ? 'text' : 'password'} required minLength={8}
                      placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)}
                      style={{ paddingRight: 48 }} />
                    <button type="button" onClick={() => setShowPwd(p => !p)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16 }}>
                      {showPwd ? '🙈' : '👁'}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                        {[0, 1, 2, 3, 4].map(i => (
                          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < pwdInfo.score ? pwdInfo.color : '#1E1E2E', transition: 'background 0.3s' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: pwdInfo.color }}>{pwdInfo.label}</div>
                    </div>
                  )}
                </div>
                <button type="submit" disabled={loading} className="ob-btn-primary" style={{ marginTop: 4 }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <svg style={{ width: 16, height: 16, animation: 'ob-spin 0.75s linear infinite' }} viewBox="0 0 24 24" fill="none"><circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                      Setting up account…
                    </span>
                  ) : 'Continue →'}
                </button>
              </form>
              <p style={{ marginTop: 20, fontSize: 12, color: '#444', textAlign: 'center' }}>
                By continuing you agree to our{' '}
                <Link href="/terms" style={{ color: '#C8A96E' }}>Terms</Link>{' '}and{' '}
                <Link href="/privacy" style={{ color: '#C8A96E' }}>Privacy Policy</Link>
              </p>
            </motion.div>
          )}

          {/* ── STEP 2: Business ─────────────────────────────────────── */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.28 }}>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 8 }}>Your business</h1>
                <p style={{ fontSize: 15, color: '#555' }}>This personalizes your AI agents and workspace URL.</p>
              </div>
              <form onSubmit={handleBusiness} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label className="ob-label">Business Name</label>
                  <input className="ob-input" type="text" required placeholder="e.g. Sharma Dental Clinic" value={bizName} onChange={e => setBizName(e.target.value)} />
                  {bizName.length > 2 && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#333' }}>Your workspace URL:</span>
                      <span style={{ color: '#C8A96E', fontFamily: 'monospace' }}>levitatelabs.online/{workspaceSlug}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="ob-label">City</label>
                    <input className="ob-input" type="text" required placeholder="e.g. Ahmedabad" value={city} onChange={e => setCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="ob-label">Phone (optional)</label>
                    <input className="ob-input" type="tel" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="ob-label">Business Category</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 4 }}>
                    {CATEGORIES.map(cat => (
                      <button key={cat.id} type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`ob-cat-card ${category === cat.id ? 'ob-cat-selected' : ''}`}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{cat.icon}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2, color: category === cat.id ? '#C8A96E' : '#888' }}>{cat.id}</div>
                      </button>
                    ))}
                  </div>
                  {!category && <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>Select your business type above</div>}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={() => setStep(1)} className="ob-btn-secondary">← Back</button>
                  <button type="submit" className="ob-btn-primary" style={{ flex: 1 }}>Continue →</button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── STEP 3: Plan ─────────────────────────────────────────── */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.28 }}>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 8 }}>Choose your plan</h1>
                <p style={{ fontSize: 15, color: '#555' }}>You can upgrade anytime. No long-term contracts.</p>
              </div>

              {/* Billing toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <button onClick={() => setBillingCycle('monthly')}
                  style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid', borderColor: billingCycle === 'monthly' ? '#C8A96E' : '#1E1E2E', background: billingCycle === 'monthly' ? '#C8A96E18' : 'transparent', color: billingCycle === 'monthly' ? '#C8A96E' : '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s' }}>
                  Monthly
                </button>
                <button onClick={() => setBillingCycle('annual')}
                  style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid', borderColor: billingCycle === 'annual' ? '#C8A96E' : '#1E1E2E', background: billingCycle === 'annual' ? '#C8A96E18' : 'transparent', color: billingCycle === 'annual' ? '#C8A96E' : '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Annual
                  <span style={{ fontSize: 10, background: '#4ade8022', color: '#4ade80', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>~15% off</span>
                </button>
              </div>

              {plansLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                  {[1, 2, 3].map(i => <div key={i} style={{ height: 240, background: '#0E0E1A', borderRadius: 16, border: '1px solid #1E1E2E', animation: 'ob-spin 0s' }} />)}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${plans.length}, 1fr)`, gap: 12 }}>
                  {plans.map(plan => {
                    const price = billingCycle === 'annual' ? Math.round(plan.annual_price / 12) : plan.monthly_price;
                    const isSel = selectedPlanSlug === plan.slug;
                    const isScale = plan.slug === 'scale';
                    return (
                      <button key={plan.id || plan.slug} type="button"
                        onClick={() => setSelectedPlanSlug(plan.slug)}
                        className={`ob-plan-card ${isSel ? 'ob-plan-selected' : ''}`}
                        style={{ textAlign: 'left' }}>
                        {plan.is_featured && (
                          <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#C8A96E', color: '#0A0A10', fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 12, letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>
                            MOST POPULAR
                          </div>
                        )}
                        {isSel && (
                          <div style={{ position: 'absolute', top: 14, right: 14, width: 22, height: 22, borderRadius: '50%', background: '#C8A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#0A0A10', fontWeight: 700 }}>✓</div>
                        )}
                        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: isSel ? '#E0E0EC' : '#AAA' }}>{plan.name}</div>
                        {plan.tagline && <div style={{ fontSize: 11, color: '#555', marginBottom: 12 }}>{plan.tagline}</div>}
                        <div style={{ marginBottom: 14 }}>
                          {isScale ? (
                            <span style={{ fontSize: 20, fontWeight: 800, color: '#C8A96E' }}>Custom</span>
                          ) : (
                            <>
                              <span style={{ fontSize: 22, fontWeight: 800, color: '#C8A96E', letterSpacing: '-0.5px' }}>{formatINR(price)}</span>
                              <span style={{ fontSize: 12, color: '#555' }}>/mo</span>
                              {billingCycle === 'annual' && <div style={{ fontSize: 10, color: '#4ade80', marginTop: 2 }}>billed annually</div>}
                            </>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {(plan.features ?? []).slice(0, 5).map(f => (
                            <div key={f} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 12, color: '#666' }}>
                              <span style={{ color: '#C8A96E', flexShrink: 0, marginTop: 1 }}>✓</span>
                              {f}
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Coupon */}
              <div style={{ marginTop: 18 }}>
                <button type="button" onClick={() => setCouponOpen(p => !p)}
                  style={{ fontSize: 13, color: '#555', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
                  <span style={{ fontSize: 14 }}>{couponOpen ? '▾' : '▸'}</span>
                  Have a coupon code?
                </button>
                {couponOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <input className="ob-input" style={{ flex: 1 }} type="text" placeholder="Enter coupon code" value={coupon} onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponValid(null); }} />
                      <button type="button"
                        style={{ padding: '0 16px', borderRadius: 10, border: '1px solid #C8A96E55', background: '#C8A96E18', color: '#C8A96E', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onClick={() => setCouponValid(coupon.length >= 3)}>
                        Apply
                      </button>
                    </div>
                    {couponValid === true && <div style={{ fontSize: 12, color: '#4ade80', marginTop: 6 }}>✓ Coupon will be applied at checkout</div>}
                    {couponValid === false && <div style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>Coupon code looks too short</div>}
                  </motion.div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button type="button" onClick={() => setStep(2)} className="ob-btn-secondary">← Back</button>
                <button type="button" onClick={handlePlanNext} className="ob-btn-primary" style={{ flex: 1 }}>
                  Continue with {activePlan?.name ?? 'selected plan'} →
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: Review & Pay ─────────────────────────────────── */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.28 }}>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 8 }}>
                  {isTrialSelected ? "Ready to launch 🚀" : "Review & pay"}
                </h1>
                <p style={{ fontSize: 15, color: '#555' }}>
                  {isTrialSelected ? "Your 14-day free trial is ready. No payment needed." : "Confirm your details then pay securely via Razorpay."}
                </p>
              </div>

              {/* Summary */}
              <div style={{ background: '#0E0E1A', border: '1px solid #1E1E2E', borderRadius: 14, padding: '20px 22px', marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#555', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 14 }}>Summary</div>
                {[
                  { label: 'Account', value: email },
                  { label: 'Name', value: fullName },
                  { label: 'Business', value: bizName || '—' },
                  { label: 'City', value: city || '—' },
                  { label: 'Category', value: category || '—' },
                  { label: 'Workspace URL', value: `levitatelabs.online/${workspaceSlug}` },
                  { label: 'Plan', value: activePlan?.name ?? '—' },
                  ...(!isTrialSelected ? [
                    { label: 'Billing', value: billingCycle === 'annual' ? 'Annual (15% off)' : 'Monthly' },
                    { label: 'Amount', value: `${formatINR(planPrice)}/month` },
                    ...(coupon && couponValid ? [{ label: 'Coupon', value: coupon }] : []),
                  ] : []),
                ].map(row => (
                  <div key={row.label} className="ob-summary-row">
                    <span style={{ color: '#555' }}>{row.label}</span>
                    <span style={{ color: '#E0E0EC', fontWeight: 500, fontFamily: row.label === 'Workspace URL' || row.label === 'Account' ? 'monospace' : 'inherit', fontSize: row.label === 'Workspace URL' || row.label === 'Account' ? 12 : 14 }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {!isTrialSelected && (
                <div style={{ background: '#0D1A0D', border: '1px solid #1A3A1A', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#4ade80', display: 'flex', gap: 8 }}>
                  <span>🔒</span>
                  <span>Payment secured by Razorpay. Your card details never touch our servers.</span>
                </div>
              )}

              {paymentLoading && (
                <div style={{ textAlign: 'center', padding: '20px 0', marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, border: '2px solid #C8A96E44', borderTopColor: '#C8A96E', borderRadius: '50%', animation: 'ob-spin 0.75s linear infinite', margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 13, color: '#666' }}>Razorpay checkout is open…</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setStep(3)} className="ob-btn-secondary">← Back</button>
                <button type="button" onClick={handleLaunch} disabled={loading || paymentLoading} className="ob-btn-primary" style={{ flex: 1 }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <svg style={{ width: 16, height: 16, animation: 'ob-spin 0.75s linear infinite' }} viewBox="0 0 24 24" fill="none"><circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                      {isTrialSelected ? 'Launching workspace…' : 'Preparing checkout…'}
                    </span>
                  ) : isTrialSelected ? '🚀 Launch Free Trial'
                    : selectedPlanSlug === 'scale' ? 'Contact Sales'
                    : `Pay ${formatINR(planPrice)}/mo with Razorpay →`}
                </button>
              </div>

              <p style={{ marginTop: 14, fontSize: 12, color: '#333', textAlign: 'center' }}>
                {isTrialSelected ? 'Workspace activates instantly. No card, no risk.' : 'Subscription activates immediately after payment confirmation.'}
              </p>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Social proof */}
        <div style={{ marginTop: 52, paddingTop: 28, borderTop: '1px solid #141420', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ display: 'flex' }}>
            {['RS', 'PP', 'AS', 'MK', 'JV'].map((init, i) => (
              <div key={init} style={{ width: 30, height: 30, borderRadius: '50%', background: `hsl(${35 + i * 12}, 55%, 42%)`, border: '2px solid #08080E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', marginLeft: i > 0 ? -9 : 0 }}>
                {init}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#555' }}>
            <strong style={{ color: '#C8A96E' }}>500+</strong> businesses launched on LEVITATE
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          div[style*="grid-template-columns: repeat(4,1fr)"] { grid-template-columns: repeat(3,1fr) !important }
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important }
          div[style*="grid-template-columns: repeat(3,1fr)"] { grid-template-columns: 1fr !important }
          h1[style*="font-size: 34px"] { font-size: 26px !important }
        }
      `}</style>
    </div>
  );
}
