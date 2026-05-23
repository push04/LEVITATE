'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Save, TicketPercent, Trash2 } from 'lucide-react'
import type { OnboardingPlan } from '@/lib/onboarding'

type CouponRecord = {
  id: string
  code: string
  name: string
  description: string | null
  status: string
  discount_type: string
  discount_value: number
  max_redemptions: number | null
  redemption_count: number | null
  min_order_amount: number | null
  max_discount_amount: number | null
  valid_from: string | null
  valid_until: string | null
  applies_to_all_plans: boolean
  eligible_plan_ids: string[]
  usage_scope: string
  is_stackable: boolean
}

const emptyForm = {
  code: '',
  name: '',
  description: '',
  status: 'draft',
  discount_type: 'percentage',
  discount_value: 10,
  max_redemptions: '',
  min_order_amount: '',
  max_discount_amount: '',
  valid_from: '',
  valid_until: '',
  applies_to_all_plans: true,
  eligible_plan_ids: [] as string[],
  usage_scope: 'per_user',
  is_stackable: false,
}

type CouponFormState = typeof emptyForm

export default function CouponManager({ plans }: { plans: OnboardingPlan[] }) {
  const [coupons, setCoupons] = useState<CouponRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CouponFormState>(emptyForm)

  const activePlans = useMemo(() => plans.filter((plan) => plan.is_active), [plans])

  const loadCoupons = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/onboarding/coupons')
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to load coupons')
      }
      setCoupons(payload.data ?? [])
    } catch (error) {
      console.error('Failed to load coupons:', error)
      setMessage(error instanceof Error ? error.message : 'Unable to load coupons')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCoupons()
  }, [])

  const reset = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const startEdit = (coupon: CouponRecord) => {
    setEditingId(coupon.id)
    setForm({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description ?? '',
      status: coupon.status,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value ?? 0),
      max_redemptions: coupon.max_redemptions?.toString() ?? '',
      min_order_amount: coupon.min_order_amount?.toString() ?? '',
      max_discount_amount: coupon.max_discount_amount?.toString() ?? '',
      valid_from: coupon.valid_from ? coupon.valid_from.slice(0, 16) : '',
      valid_until: coupon.valid_until ? coupon.valid_until.slice(0, 16) : '',
      applies_to_all_plans: coupon.applies_to_all_plans,
      eligible_plan_ids: Array.isArray(coupon.eligible_plan_ids) ? coupon.eligible_plan_ids : [],
      usage_scope: coupon.usage_scope,
      is_stackable: coupon.is_stackable,
    })
  }

  const saveCoupon = async () => {
    setSaving(true)
    setMessage('')
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase(),
        max_redemptions: form.max_redemptions === '' ? null : Number(form.max_redemptions),
        min_order_amount: form.min_order_amount === '' ? null : Number(form.min_order_amount),
        max_discount_amount: form.max_discount_amount === '' ? null : Number(form.max_discount_amount),
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
      }

      const response = await fetch(
        editingId ? `/api/admin/onboarding/coupons/${editingId}` : '/api/admin/onboarding/coupons',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const result = await response.json()
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Unable to save coupon')
      }

      setMessage(editingId ? 'Coupon updated.' : 'Coupon created.')
      reset()
      await loadCoupons()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save coupon')
    } finally {
      setSaving(false)
    }
  }

  const deleteCoupon = async (id: string) => {
    if (!window.confirm('Delete this coupon?')) {
      return
    }

    const response = await fetch(`/api/admin/onboarding/coupons/${id}`, { method: 'DELETE' })
    const payload = await response.json()
    if (!response.ok || !payload?.success) {
      setMessage(payload?.error || 'Unable to delete coupon')
      return
    }

    setMessage('Coupon deleted.')
    await loadCoupons()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">Coupons</h3>
          <p className="text-sm text-[var(--muted)]">Create discount codes businesses can redeem during subscribe flow.</p>
        </div>
        <button onClick={reset} className="btn-secondary inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New coupon
        </button>
      </div>

      {message ? <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">{message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-[var(--muted)]">Loading coupon inventory...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-[var(--secondary)]/50">
                <tr>
                  <th className="p-4">Coupon</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Usage</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-t border-[var(--border)]">
                    <td className="p-4">
                      <div className="font-medium">{coupon.code}</div>
                      <div className="text-xs text-[var(--muted)]">{coupon.name}</div>
                      {coupon.description ? <div className="mt-1 text-xs text-[var(--muted)]">{coupon.description}</div> : null}
                    </td>
                    <td className="p-4">
                      <div className="font-medium">
                        {coupon.discount_type === 'flat' ? `Rs. ${Number(coupon.discount_value).toLocaleString('en-IN')}` : `${coupon.discount_value}%`}
                      </div>
                      <div className="text-xs text-[var(--muted)]">{coupon.status}</div>
                    </td>
                    <td className="p-4 text-sm text-[var(--muted)]">
                      {coupon.redemption_count ?? 0}/{coupon.max_redemptions ?? '∞'}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(coupon)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm hover:bg-[var(--secondary)]">
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button onClick={() => deleteCoupon(coupon.id)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TicketPercent className="h-5 w-5 text-[var(--primary)]" />
            <h4 className="text-lg font-semibold">{editingId ? 'Edit coupon' : 'Create coupon'}</h4>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="Code" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Coupon name" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 md:col-span-2" rows={3} />
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
              {['draft', 'active', 'paused', 'expired'].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select value={form.discount_type} onChange={(event) => setForm({ ...form, discount_type: event.target.value })} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
              <option value="percentage">Percentage</option>
              <option value="flat">Flat</option>
            </select>
            <input type="number" value={form.discount_value} onChange={(event) => setForm({ ...form, discount_value: Number(event.target.value) })} placeholder="Discount value" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
            <input type="number" value={form.max_redemptions} onChange={(event) => setForm({ ...form, max_redemptions: event.target.value })} placeholder="Max redemptions" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
            <input type="number" value={form.min_order_amount} onChange={(event) => setForm({ ...form, min_order_amount: event.target.value })} placeholder="Minimum order amount" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
            <input type="number" value={form.max_discount_amount} onChange={(event) => setForm({ ...form, max_discount_amount: event.target.value })} placeholder="Max discount amount" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
            <input type="datetime-local" value={form.valid_from} onChange={(event) => setForm({ ...form, valid_from: event.target.value })} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
            <input type="datetime-local" value={form.valid_until} onChange={(event) => setForm({ ...form, valid_until: event.target.value })} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
            <select value={form.usage_scope} onChange={(event) => setForm({ ...form, usage_scope: event.target.value })} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 md:col-span-2">
              <option value="per_user">One per business account</option>
              <option value="global">Reusable globally</option>
            </select>
          </div>

          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--background)]/50 p-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.applies_to_all_plans} onChange={(event) => setForm({ ...form, applies_to_all_plans: event.target.checked })} />
              Apply to all plans
            </label>
            {!form.applies_to_all_plans ? (
              <div className="grid gap-2 md:grid-cols-2">
                {activePlans.map((plan) => (
                  <label key={plan.id} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.eligible_plan_ids.includes(plan.id)}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          eligible_plan_ids: event.target.checked
                            ? [...previous.eligible_plan_ids, plan.id]
                            : previous.eligible_plan_ids.filter((item) => item !== plan.id),
                        }))
                      }
                    />
                    {plan.name}
                  </label>
                ))}
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_stackable} onChange={(event) => setForm({ ...form, is_stackable: event.target.checked })} />
              Mark as stackable
            </label>
          </div>

          <div className="flex gap-2">
            <button onClick={saveCoupon} disabled={saving} className="btn-primary inline-flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving coupon...' : editingId ? 'Update coupon' : 'Create coupon'}
            </button>
            {editingId ? <button onClick={reset} className="btn-secondary">Cancel</button> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
