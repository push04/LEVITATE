'use client'

import { useEffect, useState } from 'react'
import { Pencil, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { DEFAULT_ONBOARDING_CONTENT, OnboardingContent, OnboardingPlan } from '@/lib/onboarding'
import CouponManager from '@/components/admin/CouponManager'
import {
  DEFAULT_PLAN_FEATURE_ACCESS,
  PORTAL_FEATURES,
  normalizeFeatureAccess,
  type PortalFeatureAccess
} from '@/lib/business-intelligence'

type SubscriptionRecord = {
  id: string
  company_name: string
  email: string
  billing_cycle: string
  status: string
  subdomain_url: string | null
  workspace_backlink_url?: string | null
  onboarding_plans?: {
    name?: string | null
  } | null
}

const emptyPlan = {
  slug: '',
  name: '',
  tagline: '',
  description: '',
  monthly_price: 0,
  annual_price: 0,
  monthly_setup_fee: 0,
  annual_setup_fee: 0,
  features: '',
  highlights: '',
  deliverables: '',
  is_featured: false,
  is_active: true,
  sort_order: 0,
  cta_label: 'Start onboarding',
  support_level: 'Standard support'
}

type PlanFormState = typeof emptyPlan & {
  feature_controls: PortalFeatureAccess
}

export default function OnboardingManager() {
  const [plans, setPlans] = useState<OnboardingPlan[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([])
  const [content, setContent] = useState<OnboardingContent>(DEFAULT_ONBOARDING_CONTENT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<PlanFormState>({
    ...emptyPlan,
    feature_controls: { ...DEFAULT_PLAN_FEATURE_ACCESS }
  })

  const load = async () => {
    setLoading(true)
    try {
      const [plansRes, contentRes, subsRes] = await Promise.all([
        fetch('/api/admin/onboarding/plans'),
        fetch('/api/admin/settings?key=onboarding_page_content'),
        fetch('/api/admin/onboarding/subscriptions')
      ])
      const plansJson = await plansRes.json()
      const contentJson = await contentRes.json()
      const subsJson = await subsRes.json()
      setPlans(plansJson.data ?? [])
      setSubscriptions(subsJson.data ?? [])
      if (contentJson.success) {
        try {
          setContent(contentJson.value ? JSON.parse(contentJson.value) : DEFAULT_ONBOARDING_CONTENT)
        } catch {
          setContent(DEFAULT_ONBOARDING_CONTENT)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const startEdit = (plan: OnboardingPlan) => {
    setEditingId(plan.id)
    setForm({
      slug: plan.slug,
      name: plan.name,
      tagline: plan.tagline ?? '',
      description: plan.description ?? '',
      monthly_price: plan.monthly_price,
      annual_price: plan.annual_price,
      monthly_setup_fee: plan.monthly_setup_fee,
      annual_setup_fee: plan.annual_setup_fee,
      features: (plan.features ?? []).join('\n'),
      highlights: (plan.highlights ?? []).join('\n'),
      deliverables: (plan.deliverables ?? []).join('\n'),
      is_featured: plan.is_featured,
      is_active: plan.is_active,
      sort_order: plan.sort_order,
      cta_label: plan.cta_label,
      support_level: plan.support_level,
      feature_controls: normalizeFeatureAccess(plan.feature_controls ?? DEFAULT_PLAN_FEATURE_ACCESS)
    })
  }

  const reset = () => {
    setEditingId(null)
    setForm({
      ...emptyPlan,
      feature_controls: { ...DEFAULT_PLAN_FEATURE_ACCESS }
    })
  }

  const savePlan = async () => {
    setSaving(true)
    setMessage('')
    try {
      const payload = {
        ...form,
        features: form.features,
        highlights: form.highlights,
        deliverables: form.deliverables,
        feature_controls: form.feature_controls,
        sync_razorpay: true
      }
      const res = await fetch(editingId ? `/api/admin/onboarding/plans/${editingId}` : '/api/admin/onboarding/plans', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Save failed')
      setMessage('Plan saved.')
      reset()
      load()
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const deletePlan = async (id: string) => {
    if (!confirm('Delete this plan?')) return
    const res = await fetch(`/api/admin/onboarding/plans/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      setMessage('Plan deleted.')
      load()
    }
  }

  const saveContent = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'onboarding_page_content', value: JSON.stringify(content) })
      })
      setMessage('Page content saved.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-[var(--muted)]">Loading onboarding catalog...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold">Onboarding Catalog</h2>
          <p className="text-sm text-[var(--muted)]">Edit pricing, plans, and public page copy from here.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" />Refresh</button>
          <button onClick={reset} className="btn-secondary inline-flex items-center gap-2"><Plus className="w-4 h-4" />New Plan</button>
        </div>
      </div>

      {message && <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">{message}</div>}

      <div className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-4">
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[var(--secondary)]/50">
                <tr>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Monthly</th>
                  <th className="p-4">Annual</th>
                  <th className="p-4">Controls</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.id} className="border-t border-[var(--border)]">
                    <td className="p-4">
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-xs text-[var(--muted)]">{plan.slug}</div>
                    </td>
                    <td className="p-4">Rs. {Number(plan.monthly_price).toLocaleString('en-IN')}</td>
                    <td className="p-4">Rs. {Number(plan.annual_price).toLocaleString('en-IN')}</td>
                    <td className="p-4 text-sm text-[var(--muted)]">
                      {Object.values(normalizeFeatureAccess(plan.feature_controls ?? DEFAULT_PLAN_FEATURE_ACCESS)).filter(Boolean).length} enabled
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(plan)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm hover:bg-[var(--secondary)]"><Pencil className="w-4 h-4" />Edit</button>
                        <button onClick={() => deletePlan(plan.id)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" />Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-xl font-semibold">{editingId ? 'Edit Plan' : 'Create Plan'}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
              <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="Slug" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
              <input value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} placeholder="Tagline" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 md:col-span-2" />
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 md:col-span-2" rows={3} />
              <input type="number" value={form.monthly_price} onChange={e => setForm({ ...form, monthly_price: Number(e.target.value) })} placeholder="Monthly price" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
              <input type="number" value={form.annual_price} onChange={e => setForm({ ...form, annual_price: Number(e.target.value) })} placeholder="Annual price" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
              <input type="number" value={form.monthly_setup_fee} onChange={e => setForm({ ...form, monthly_setup_fee: Number(e.target.value) })} placeholder="Monthly setup fee" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
              <input type="number" value={form.annual_setup_fee} onChange={e => setForm({ ...form, annual_setup_fee: Number(e.target.value) })} placeholder="Annual setup fee" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
              <input value={form.cta_label} onChange={e => setForm({ ...form, cta_label: e.target.value })} placeholder="CTA label" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
              <input value={form.support_level} onChange={e => setForm({ ...form, support_level: e.target.value })} placeholder="Support level" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" />
              <textarea value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} placeholder="Features, one per line" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 md:col-span-2" rows={4} />
              <textarea value={form.highlights} onChange={e => setForm({ ...form, highlights: e.target.value })} placeholder="Highlights, one per line" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 md:col-span-2" rows={3} />
              <textarea value={form.deliverables} onChange={e => setForm({ ...form, deliverables: e.target.value })} placeholder="Deliverables, one per line" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 md:col-span-2" rows={4} />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} /> Featured</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
              <label className="flex items-center gap-2">Sort <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-20 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1" /></label>
            </div>
            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--background)]/60 p-4">
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">Plan feature controls</div>
                <p className="mt-1 text-xs leading-6 text-[var(--muted)]">Decide which LevitateOS business modules each plan unlocks for subscribers.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {PORTAL_FEATURES.map(feature => {
                  const enabled = form.feature_controls[feature.key]
                  return (
                    <button
                      key={feature.key}
                      type="button"
                      onClick={() => setForm({
                        ...form,
                        feature_controls: {
                          ...form.feature_controls,
                          [feature.key]: !enabled
                        }
                      })}
                      className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                        enabled
                          ? 'border-[#c8a96e]/30 bg-[#c8a96e]/10'
                          : 'border-[var(--border)] bg-[var(--surface)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-[var(--foreground)]">{feature.label}</div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                          enabled ? 'bg-[#c8a96e] text-[#140f07]' : 'bg-[var(--secondary)] text-[var(--muted)]'
                        }`}>
                          {enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="mt-2 text-xs leading-6 text-[var(--muted)]">{feature.description}</div>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={savePlan} disabled={saving} className="btn-primary inline-flex items-center gap-2"><Save className="w-4 h-4" />{saving ? 'Saving' : 'Save Plan'}</button>
              {editingId && <button onClick={reset} className="btn-secondary">Cancel</button>}
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <h3 className="text-xl font-semibold">Public Page Content</h3>
            <input value={content.eyebrow} onChange={e => setContent({ ...content, eyebrow: e.target.value })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" placeholder="Eyebrow" />
            <input value={content.title} onChange={e => setContent({ ...content, title: e.target.value })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" placeholder="Title" />
            <textarea value={content.subtitle} onChange={e => setContent({ ...content, subtitle: e.target.value })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" rows={3} placeholder="Subtitle" />
            <textarea value={content.trustItems.join('\n')} onChange={e => setContent({ ...content, trustItems: e.target.value.split('\n').map(v => v.trim()).filter(Boolean) })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" rows={4} placeholder="Trust items, one per line" />
            <textarea value={content.faqs.map(f => `${f.q}||${f.a}`).join('\n')} onChange={e => setContent({ ...content, faqs: e.target.value.split('\n').filter(Boolean).map(row => { const [q, a] = row.split('||'); return { q: q?.trim() ?? '', a: a?.trim() ?? '' } }) })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3" rows={5} placeholder="FAQ question||answer, one per line" />
            <div className="flex gap-2">
              <button onClick={saveContent} disabled={saving} className="btn-primary inline-flex items-center gap-2"><Save className="w-4 h-4" />Save Page Copy</button>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div>
            <h3 className="text-xl font-semibold">Recent Signups</h3>
            <p className="text-sm text-[var(--muted)]">Live subscription requests and branded workspace routes.</p>
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-[var(--secondary)]/50">
            <tr>
              <th className="p-4">Company</th>
              <th className="p-4">Plan</th>
              <th className="p-4">Billing</th>
              <th className="p-4">Status</th>
                <th className="p-4">Business backlink</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.slice(0, 8).map(sub => (
              <tr key={sub.id} className="border-t border-[var(--border)]">
                <td className="p-4">
                  <div className="font-medium">{sub.company_name}</div>
                  <div className="text-xs text-[var(--muted)]">{sub.email}</div>
                </td>
                <td className="p-4">{sub.onboarding_plans?.name ?? 'Unknown'}</td>
                <td className="p-4 capitalize">{sub.billing_cycle}</td>
                <td className="p-4 capitalize">{sub.status}</td>
                <td className="p-4 text-sm text-[var(--muted)]">{sub.workspace_backlink_url ?? sub.subdomain_url}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CouponManager plans={plans} />
    </div>
  )
}
