'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Eye, EyeOff, ArrowRight, ArrowLeft, Sparkles, Building2, MapPin, User, Mail, Lock } from 'lucide-react';
import s from '@/styles/home.module.css';

const CATEGORIES = [
  'Restaurant', 'Clinic', 'Coaching Centre', 'Real Estate',
  'Salon', 'Gym', 'Retailer', 'E-commerce', 'Consultancy', 'Other',
];

const PLANS = [
  {
    id: 'trial',
    name: 'Trial',
    price: 'FREE',
    period: '14 days',
    features: ['All 16 AI agents', 'Lead finder', 'Pipeline view', 'Agent activity feed', 'No credit card'],
    popular: false,
    cta: 'Start Free Trial',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '₹12,999',
    period: '/month',
    features: ['Everything in Trial', 'Send outreach messages', 'Generate proposals', 'Deploy websites', 'Email support'],
    popular: false,
    cta: 'Choose Starter',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '₹24,999',
    period: '/month',
    features: ['Everything in Starter', 'Custom workflows', 'Priority support', 'Advanced analytics', '5 client seats'],
    popular: true,
    cta: 'Choose Growth',
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '₹49,999',
    period: '/month',
    features: ['Everything in Growth', 'White-label', 'Reseller program', 'Dedicated support', 'Unlimited seats'],
    popular: false,
    cta: 'Contact Sales',
  },
];

const STEPS = ['Account', 'Business Details', 'Plan Selection', 'Launch'];

interface AccountData {
  email: string;
  password: string;
  fullName: string;
}

interface BusinessData {
  businessName: string;
  city: string;
  category: string;
}

export default function Onboard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 1 data
  const [account, setAccount] = useState<AccountData>({ email: '', password: '', fullName: '' });

  // Step 2 data
  const [business, setBusiness] = useState<BusinessData>({ businessName: '', city: '', category: '' });

  // Step 3 data
  const [selectedPlan, setSelectedPlan] = useState('trial');

  const updateAccount = (field: keyof AccountData, value: string) =>
    setAccount((prev) => ({ ...prev, [field]: value }));
  const updateBusiness = (field: keyof BusinessData, value: string) =>
    setBusiness((prev) => ({ ...prev, [field]: value }));

  // ── Step 1: Create / sign-in account ─────────────────────────────────────
  async function handleAccountStep(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();

      // Try sign-up first; if user exists, sign in
      const { error: signUpError } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
        options: { data: { full_name: account.fullName } },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered') ||
            signUpError.message.toLowerCase().includes('user already exists')) {
          // User exists — sign in instead
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: account.email,
            password: account.password,
          });
          if (signInError) throw new Error('Incorrect password for this email. Please try again.');
        } else {
          throw new Error(signUpError.message);
        }
      }

      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Account setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Save business details ──────────────────────────────────────────
  function handleBusinessStep(e: React.FormEvent) {
    e.preventDefault();
    if (!business.businessName.trim() || !business.city.trim() || !business.category) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setStep(3);
  }

  // ── Step 3: Plan selected ──────────────────────────────────────────────────
  function handlePlanStep() {
    setStep(4);
  }

  // ── Step 4: Launch ────────────────────────────────────────────────────────
  async function handleLaunch() {
    setLoading(true);
    setError('');
    try {
      if (selectedPlan === 'trial') {
        const res = await fetch('/api/trial/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName: business.businessName || undefined }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to start trial');
        }
        router.push('/business/dashboard');
      } else if (selectedPlan === 'scale') {
        router.push('/#contact');
      } else {
        router.push(`/business/subscribe?plan=${selectedPlan}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Launch failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1916] py-12 px-4 selection:bg-[#B08D57]/30">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center sm:text-left">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#6B6860] hover:text-[#B08D57] transition-colors mb-6 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <h1 className={`${s.sectionHeadline} text-4xl md:text-5xl font-normal mb-4`}>
            <span className="text-[#B08D57] italic">Start</span> your automation journey
          </h1>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
            {['Review your plan before any payment', 'Your workspace is saved', 'Your business gets its own URL'].map((pill) => (
              <span key={pill} className="px-3 py-1 bg-[#F4F2EE] border border-[#E5E0D8] rounded-full text-[11px] font-semibold text-[#6B6860] uppercase tracking-wider">
                {pill}
              </span>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i + 1 <= step ? 'bg-[#B08D57]' : 'bg-[#E5E0D8]'
                }`}
              />
              <div
                className={`text-xs mt-2 transition-colors uppercase tracking-wider font-semibold ${
                  i + 1 === step ? 'text-[#B08D57]' : i + 1 < step ? 'text-[#1A1916]' : 'text-[#6B6860]/50'
                }`}
              >
                {i + 1 < step && <Check className="w-3.5 h-3.5 inline mr-1" />}
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── STEP 1: Account ──────────────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <div className="bg-white rounded-2xl border border-[#E5E0D8] p-8 space-y-6 shadow-[0_8px_32px_rgba(26,25,22,0.04)]">
                <div>
                  <h2 className={`${s.sectionHeadline} text-3xl mb-2`}>Create your account</h2>
                  <p className="text-sm text-[#6B6860]">
                    Already have an account?{' '}
                    <Link href="/business/login?next=/onboard" className="text-[#B08D57] font-semibold hover:underline underline-offset-4 transition-all">
                      Sign in
                    </Link>
                  </p>
                </div>
                <form onSubmit={handleAccountStep} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-[#6B6860] mb-2 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6860]/60"><User className="w-4 h-4" /></div>
                      <input
                        type="text"
                        required
                        value={account.fullName}
                        onChange={(e) => updateAccount('fullName', e.target.value)}
                        placeholder="Your full name"
                        className="w-full pl-11 pr-4 py-3.5 bg-[#FAFAF8] border border-[#E5E0D8] rounded-xl text-[#1A1916] placeholder:text-[#6B6860]/60 focus:outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]/30 transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6B6860] mb-2 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6860]/60"><Mail className="w-4 h-4" /></div>
                      <input
                        type="email"
                        required
                        value={account.email}
                        onChange={(e) => updateAccount('email', e.target.value)}
                        placeholder="you@yourbusiness.com"
                        className="w-full pl-11 pr-4 py-3.5 bg-[#FAFAF8] border border-[#E5E0D8] rounded-xl text-[#1A1916] placeholder:text-[#6B6860]/60 focus:outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]/30 transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6B6860] mb-2 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6860]/60"><Lock className="w-4 h-4" /></div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={account.password}
                        onChange={(e) => updateAccount('password', e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full pl-11 pr-12 py-3.5 bg-[#FAFAF8] border border-[#E5E0D8] rounded-xl text-[#1A1916] placeholder:text-[#6B6860]/60 focus:outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]/30 transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6860] hover:text-[#1A1916] transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#B08D57] text-[#FAFAF8] font-semibold rounded-xl hover:bg-[#8C6D3F] transition-all disabled:opacity-50 hover:shadow-[0_4px_20px_rgba(176,141,87,0.3)] shadow-sm active:scale-[0.98]"
                  >
                    {loading ? 'Creating account…' : <>Continue <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Business Details ──────────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <div className="bg-white rounded-2xl border border-[#E5E0D8] p-8 space-y-6 shadow-[0_8px_32px_rgba(26,25,22,0.04)]">
                <div>
                  <h2 className={`${s.sectionHeadline} text-3xl mb-2`}>Tell us about your business</h2>
                  <p className="text-sm text-[#6B6860]">This helps us personalise your workspace and AI agents.</p>
                </div>
                <form onSubmit={handleBusinessStep} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-[#6B6860] mb-2 uppercase tracking-wider">Business Name</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6860]/60"><Building2 className="w-4 h-4" /></div>
                      <input
                        type="text"
                        required
                        value={business.businessName}
                        onChange={(e) => updateBusiness('businessName', e.target.value)}
                        placeholder="e.g. Sharma Dental Clinic"
                        className="w-full pl-11 pr-4 py-3.5 bg-[#FAFAF8] border border-[#E5E0D8] rounded-xl text-[#1A1916] placeholder:text-[#6B6860]/60 focus:outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]/30 transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6B6860] mb-2 uppercase tracking-wider">City</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6860]/60"><MapPin className="w-4 h-4" /></div>
                      <input
                        type="text"
                        required
                        value={business.city}
                        onChange={(e) => updateBusiness('city', e.target.value)}
                        placeholder="e.g. Ahmedabad"
                        className="w-full pl-11 pr-4 py-3.5 bg-[#FAFAF8] border border-[#E5E0D8] rounded-xl text-[#1A1916] placeholder:text-[#6B6860]/60 focus:outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]/30 transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6B6860] mb-2 uppercase tracking-wider">Business Category</label>
                    <select
                      required
                      value={business.category}
                      onChange={(e) => updateBusiness('category', e.target.value)}
                      className="w-full px-4 py-3.5 bg-[#FAFAF8] border border-[#E5E0D8] rounded-xl text-[#1A1916] focus:outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]/30 transition-all appearance-none cursor-pointer font-medium"
                    >
                      <option value="" disabled>Select your category</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 py-4 bg-white border border-[#E5E0D8] rounded-xl text-sm font-semibold text-[#6B6860] hover:border-[#B08D57] hover:text-[#1A1916] transition-all shadow-sm active:scale-[0.98]"
                    >
                      <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#B08D57] text-[#FAFAF8] font-semibold rounded-xl hover:bg-[#8C6D3F] transition-all hover:shadow-[0_4px_20px_rgba(176,141,87,0.3)] shadow-sm active:scale-[0.98]"
                    >
                      Continue <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Plan Selection ────────────────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <div className="space-y-5">
                <div className="text-center sm:text-left mb-6">
                  <h2 className={`${s.sectionHeadline} text-3xl mb-2`}>Choose your plan</h2>
                  <p className="text-sm text-[#6B6860]">You can change or upgrade anytime. No lock-ins.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative text-left p-6 rounded-2xl border transition-all ${
                        selectedPlan === plan.id
                          ? 'border-[#B08D57] bg-white shadow-[0_8px_32px_rgba(176,141,87,0.15)] ring-1 ring-[#B08D57]'
                          : 'border-[#E5E0D8] bg-[#F4F2EE] hover:border-[#B08D57]/50 hover:bg-white hover:shadow-sm hover:-translate-y-1'
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#1A1916] text-[#FAFAF8] text-[10px] font-bold uppercase tracking-widest rounded-full shadow-md">
                          MOST POPULAR
                        </div>
                      )}
                      {selectedPlan === plan.id && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#B08D57] flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className="font-semibold text-lg mb-1 text-[#1A1916]">{plan.name}</div>
                      <div className="text-2xl font-bold text-[#B08D57] mb-4 font-serif">
                        {plan.price}<span className="text-sm font-medium text-[#6B6860] font-sans ml-1">{plan.period}</span>
                      </div>
                      <ul className="space-y-2.5">
                        {plan.features.map((f) => (
                          <li key={f} className="text-sm text-[#6B6860] flex items-start gap-2 font-medium">
                            <Check className="w-4 h-4 text-[#B08D57] mt-0.5 shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 pt-6">
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-4 bg-white border border-[#E5E0D8] rounded-xl text-sm font-semibold text-[#6B6860] hover:border-[#B08D57] hover:text-[#1A1916] transition-all shadow-sm active:scale-[0.98]"
                  >
                    <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
                  </button>
                  <button
                    onClick={handlePlanStep}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#1A1916] text-[#FAFAF8] font-semibold rounded-xl hover:bg-black transition-all hover:shadow-lg shadow-sm active:scale-[0.98]"
                  >
                    Continue with {PLANS.find((p) => p.id === selectedPlan)?.name} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: Launch ───────────────────────────────────────────── */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <div className="bg-white rounded-2xl border border-[#E5E0D8] p-8 space-y-6 shadow-[0_8px_32px_rgba(26,25,22,0.04)]">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-[#F4F2EE] border border-[#E5E0D8] flex items-center justify-center mx-auto mb-5 shadow-inner">
                    <Sparkles className="w-10 h-10 text-[#B08D57]" />
                  </div>
                  <h2 className={`${s.sectionHeadline} text-3xl mb-2`}>You&apos;re ready to launch!</h2>
                  <p className="text-sm text-[#6B6860] font-medium">Here&apos;s a summary of your workspace:</p>
                </div>

                {/* Summary */}
                <div className="grid gap-3">
                  {[
                    { label: 'Account', value: account.email },
                    { label: 'Business', value: business.businessName || 'Not specified' },
                    { label: 'City', value: business.city || 'Not specified' },
                    { label: 'Category', value: business.category || 'Not specified' },
                    { label: 'Plan', value: PLANS.find((p) => p.id === selectedPlan)?.name || selectedPlan },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between px-5 py-3.5 rounded-xl bg-[#FAFAF8] border border-[#E5E0D8]">
                      <span className="text-xs font-semibold text-[#6B6860] uppercase tracking-wider">{label}</span>
                      <span className="text-sm font-bold text-[#1A1916]">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setStep(3)}
                    className="px-6 py-4 bg-white border border-[#E5E0D8] rounded-xl text-sm font-semibold text-[#6B6860] hover:border-[#B08D57] hover:text-[#1A1916] transition-all shadow-sm active:scale-[0.98]"
                  >
                    <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
                  </button>
                  <button
                    onClick={handleLaunch}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#B08D57] text-[#FAFAF8] font-semibold rounded-xl hover:bg-[#8C6D3F] transition-all disabled:opacity-50 hover:shadow-[0_4px_20px_rgba(176,141,87,0.3)] shadow-sm active:scale-[0.98]"
                  >
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Launching Workspace…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {selectedPlan === 'trial' ? 'Launch Free Trial' : selectedPlan === 'scale' ? 'Contact Sales' : 'Proceed to Payment'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Social proof */}
        <div className="mt-12 pt-8 border-t border-[#E5E0D8] flex flex-col sm:flex-row items-center justify-center gap-6">
          <div className="flex items-center">
            {[
              { initials: 'RS', name: 'Rahul S.' },
              { initials: 'PP', name: 'Priya P.' },
              { initials: 'AS', name: 'Amit S.' },
            ].map(({ initials }, idx) => (
              <div key={initials} className={`w-10 h-10 rounded-full border-2 border-[#FAFAF8] bg-[#B08D57] flex items-center justify-center text-[#FAFAF8] text-xs font-bold shrink-0 shadow-sm ${idx > 0 ? '-ml-3' : ''}`}>
                {initials}
              </div>
            ))}
          </div>
          <div className="text-center sm:text-left text-sm font-medium text-[#6B6860]">
            Join <strong className="text-[#1A1916]">500+ businesses</strong> already scaling<br className="hidden sm:block"/> with LevitateOS automation.
          </div>
        </div>
      </div>
    </div>
  );
}
