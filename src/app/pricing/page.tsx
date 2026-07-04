'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import NewsletterSignup from '@/components/NewsletterSignup';
import JsonLd from '@/components/JsonLd';

interface DBPlan {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  monthly_price: number;
  annual_price: number;
  monthly_setup_fee: number;
  annual_setup_fee: number;
  features: string[] | null;
  is_featured: boolean;
  cta_label: string;
}

function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const [plans, setPlans] = useState<DBPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/onboard/plans');
        const data = await res.json();
        if (data.success && Array.isArray(data.plans)) setPlans(data.plans as DBPlan[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasSetupFee = plans.some((p) => (yearly ? p.annual_setup_fee : p.monthly_setup_fee) > 0);

  return (
    <div className="min-h-screen py-16 bg-[var(--background)] text-[var(--foreground)]">
      <JsonLd schema={{ '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What happens after trial?', acceptedAnswer: { '@type': 'Answer', text: 'Your data is saved and you can upgrade anytime.' } },
        { '@type': 'Question', name: 'Can I cancel anytime?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, cancel anytime from your dashboard.' } },
        { '@type': 'Question', name: 'Is there a setup fee?', acceptedAnswer: { '@type': 'Answer', text: hasSetupFee ? 'Most plans include a one-time setup fee, charged with your first payment. The exact amount for each plan is shown at checkout.' : 'No setup fees ever.' } },
        { '@type': 'Question', name: 'What is website deployment?', acceptedAnswer: { '@type': 'Answer', text: 'We build and deploy a professional website for your business.' } },
        { '@type': 'Question', name: 'Do I need WhatsApp Business?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, a WhatsApp Business account is required for automation.' } }
      ]}} />

      <div className="max-w-screen-2xl mx-auto px-4">
        <h1 className="text-5xl font-bold text-center mb-4 text-[#C8A96E]">Try Everything Free for 14 Days</h1>
        <p className="text-center text-[var(--muted)] mb-8">No credit card required</p>
        <Link href="/trial" className="block w-full max-w-md mx-auto mb-12 px-6 py-3 bg-[#C8A96E] text-[var(--foreground)] font-semibold rounded-lg text-center hover:brightness-110">
          Start Free Trial — No Credit Card
        </Link>

        <div className="mb-8 text-center">
          <button onClick={() => setYearly(!yearly)} className="px-4 py-2 bg-white/10 rounded-lg">
            {yearly ? 'Yearly (2 months free!)' : 'Monthly'}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 rounded-lg border border-white/10 bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
            {plans.map((plan) => {
              const price = yearly ? Math.round(plan.annual_price / 12) : plan.monthly_price;
              const setupFee = yearly ? plan.annual_setup_fee : plan.monthly_setup_fee;
              const isContact = plan.monthly_price <= 0;
              return (
                <div key={plan.id} className={`p-6 rounded-lg border ${plan.is_featured ? 'border-[#C8A96E] bg-[#C8A96E]/10' : 'border-white/10 bg-white/5'} relative`}>
                  {plan.is_featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#C8A96E] text-[var(--foreground)] text-xs font-bold rounded">MOST POPULAR</div>}
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  {plan.tagline && <p className="text-xs text-[var(--muted)] mb-3">{plan.tagline}</p>}
                  <div className="text-3xl font-bold text-[#C8A96E] mb-1">
                    {isContact ? 'Custom quote' : <>{formatINR(price)}<span className="text-base font-normal">/month</span></>}
                  </div>
                  {!isContact && setupFee > 0 && (
                    <div className="text-xs text-[var(--muted)] mb-4">+ {formatINR(setupFee)} one-time setup fee</div>
                  )}
                  {(!isContact && setupFee <= 0) && <div className="mb-4" />}
                  {isContact && <div className="mb-4" />}
                  <ul className="space-y-2 mb-6">
                    {(plan.features ?? []).slice(0, 6).map((f) => <li key={f} className="text-sm text-[var(--muted)]">✓ {f}</li>)}
                  </ul>
                  <Link href={`/onboard?plan=${plan.slug}`} className={`block text-center px-4 py-2 rounded font-semibold ${plan.is_featured ? 'bg-[#C8A96E] text-[var(--foreground)]' : 'border border-[#C8A96E] text-[#C8A96E]'}`}>
                    {isContact ? 'Contact Sales' : plan.cta_label || `Choose ${plan.name}`}
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          <NewsletterSignup source="pricing" heading="Get weekly automation tips" />
        </div>
      </div>
    </div>
  );
}
