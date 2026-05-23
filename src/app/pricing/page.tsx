'use client';
import { useState } from 'react';
import Link from 'next/link';
import NewsletterSignup from '@/components/NewsletterSignup';
import JsonLd from '@/components/JsonLd';

const plans = [
  { name: 'Trial', price: 'FREE', period: '14 days', features: ['All 16 agents', 'Lead finder', 'Pipeline view', 'Agent activity feed', 'No credit card'], cta: 'Start Free Trial', popular: false },
  { name: 'Starter', price: '₹12,999', period: '/month', features: ['Everything in Trial', 'Send outreach messages', 'Generate proposals', 'Deploy websites', 'Email support'], cta: 'Choose Starter', popular: false },
  { name: 'Growth', price: '₹24,999', period: '/month', features: ['Everything in Starter', 'Custom workflows', 'Priority support', 'Advanced analytics', '5 client seats'], cta: 'Choose Growth', popular: true },
  { name: 'Scale', price: '₹49,999', period: '/month', features: ['Everything in Growth', 'White-label', 'Reseller program', 'Dedicated support', 'Unlimited seats'], cta: 'Contact Sales', popular: false },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="min-h-screen py-16 bg-[var(--background)] text-[var(--foreground)]">
      <JsonLd schema={{ '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What happens after trial?', acceptedAnswer: { '@type': 'Answer', text: 'Your data is saved and you can upgrade anytime.' } },
        { '@type': 'Question', name: 'Can I cancel anytime?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, cancel anytime from your dashboard.' } },
        { '@type': 'Question', name: 'Is there a setup fee?', acceptedAnswer: { '@type': 'Answer', text: 'No setup fees ever.' } },
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          {plans.map(plan => (
            <div key={plan.name} className={`p-6 rounded-lg border ${plan.popular ? 'border-[#C8A96E] bg-[#C8A96E]/10' : 'border-white/10 bg-white/5'} relative`}>
              {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#C8A96E] text-[var(--foreground)] text-xs font-bold rounded">MOST POPULAR</div>}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="text-3xl font-bold text-[#C8A96E] mb-4">{plan.price}<span className="text-base font-normal">{plan.period}</span></div>
              <ul className="space-y-2 mb-6">
                {plan.features.map(f => <li key={f} className="text-sm text-[var(--muted)]">✓ {f}</li>)}
              </ul>
              <Link href="/onboard" className={`block text-center px-4 py-2 rounded font-semibold ${plan.popular ? 'bg-[#C8A96E] text-[var(--foreground)]' : 'border border-[#C8A96E] text-[#C8A96E]'}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          <NewsletterSignup source="pricing" heading="Get weekly automation tips" />
        </div>
      </div>
    </div>
  );
}
