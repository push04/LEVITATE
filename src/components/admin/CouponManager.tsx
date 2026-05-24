'use client';

import { useState } from 'react';
import { Plus, Tag, Trash2 } from 'lucide-react';
import type { OnboardingPlan } from '@/lib/onboarding';

interface Coupon {
  code: string;
  discountPct: number;
  planIds: string[];
  expiresAt: string;
}

export default function CouponManager({ plans }: { plans: OnboardingPlan[] }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [expiry, setExpiry] = useState('');

  const add = () => {
    if (!code || !discount) return;
    setCoupons(prev => [...prev, { code: code.toUpperCase(), discountPct: Number(discount), planIds: plans.map(p => p.id), expiresAt: expiry }]);
    setCode(''); setDiscount(''); setExpiry('');
  };

  return (
    <section className="mt-8 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-center gap-2 mb-5">
        <Tag className="h-5 w-5 text-[var(--primary)]" />
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Coupon Codes</h2>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="COUPON20"
          className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--foreground)] focus:outline-none"
        />
        <input
          type="number"
          value={discount}
          onChange={e => setDiscount(e.target.value)}
          placeholder="Discount %"
          min="1" max="100"
          className="w-32 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--foreground)] focus:outline-none"
        />
        <input
          type="date"
          value={expiry}
          onChange={e => setExpiry(e.target.value)}
          className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--foreground)] focus:outline-none"
        />
        <button
          onClick={add}
          className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {coupons.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No coupons created yet.</p>
      ) : (
        <div className="space-y-2">
          {coupons.map((c, i) => (
            <div key={i} className="flex items-center justify-between rounded-[10px] border border-[var(--border)] px-4 py-3 text-sm">
              <span className="font-mono font-bold text-[var(--primary)]">{c.code}</span>
              <span className="text-[var(--muted)]">{c.discountPct}% off</span>
              {c.expiresAt && <span className="text-[var(--muted)]">Expires {c.expiresAt}</span>}
              <button onClick={() => setCoupons(prev => prev.filter((_, j) => j !== i))} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
