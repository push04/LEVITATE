'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit2, Trash2, X, Check, RefreshCw, ToggleLeft, ToggleRight,
  Users, TrendingUp, Zap, Crown, ChevronDown, ChevronUp, AlertCircle,
  IndianRupee, Key, ShieldCheck
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ApiPlan {
  id: string
  name: string
  slug: string
  price_monthly: number
  price_annual: number | null
  call_limit: number
  max_keys: number
  features: string[]
  badge: string | null
  tier: 'starter' | 'growth' | 'scale'
  is_active: boolean
  created_at: string
  subscriber_count?: number
}

interface ApiKeyRow {
  id: string
  user_id: string
  key_prefix: string
  name: string
  requests_count: number
  is_active: boolean
  plan_id: string | null
  created_at: string
  email?: string
  plan_name?: string
}

interface RevenueStats {
  total_subscribers: number
  mrr: number
  arr: number
  most_popular: string
}

const TIER_COLORS: Record<string, string> = {
  starter: '#6B7280',
  growth: '#B08D57',
  scale: '#7C3AED',
}

const TIER_BG: Record<string, string> = {
  starter: 'rgba(107,114,128,0.08)',
  growth: 'rgba(176,141,87,0.1)',
  scale: 'rgba(124,58,237,0.08)',
}

const defaultForm: Omit<ApiPlan, 'id' | 'created_at' | 'subscriber_count'> = {
  name: '',
  slug: '',
  price_monthly: 0,
  price_annual: null,
  call_limit: 500,
  max_keys: 1,
  features: [''],
  badge: null,
  tier: 'starter',
  is_active: true,
}

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function fmtINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

function fmtLimit(n: number) {
  if (n === 0) return 'Unlimited'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M/mo`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K/mo`
  return `${n}/mo`
}

export default function ApiPlansAdminPage() {
  const [plans, setPlans] = useState<ApiPlan[]>([])
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [stats, setStats] = useState<RevenueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [keysLoading, setKeysLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPlan, setEditPlan] = useState<ApiPlan | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [overrideEmail, setOverrideEmail] = useState('')
  const [overrideLimit, setOverrideLimit] = useState('')
  const [overrideSaving, setOverrideSaving] = useState(false)
  const [overrideMsg, setOverrideMsg] = useState('')
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState('')

  const toast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  const loadPlans = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('api_plans')
      .select('*')
      .order('price_monthly', { ascending: true })

    if (!error && data) {
      const withCounts = await Promise.all(
        data.map(async (plan: ApiPlan) => {
          const { count } = await supabase
            .from('api_keys')
            .select('id', { count: 'exact', head: true })
            .eq('plan_id', plan.id)
            .eq('is_active', true)
          return { ...plan, subscriber_count: count ?? 0 }
        })
      )
      setPlans(withCounts)

      const totalSubs = withCounts.reduce((a, p) => a + (p.subscriber_count ?? 0), 0)
      const mrr = withCounts.reduce((a, p) => a + (p.subscriber_count ?? 0) * p.price_monthly, 0)
      const mostPopular = withCounts.sort((a, b) => (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0))[0]?.name ?? '—'
      setStats({ total_subscribers: totalSubs, mrr, arr: mrr * 12, most_popular: mostPopular })
    }
    setLoading(false)
  }, [])

  const loadKeys = useCallback(async () => {
    setKeysLoading(true)
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, user_id, key_prefix, name, requests_count, is_active, plan_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      const plansMap: Record<string, string> = {}
      plans.forEach(p => { plansMap[p.id] = p.name })

      const enriched = data.map((k: ApiKeyRow) => ({
        ...k,
        plan_name: k.plan_id ? (plansMap[k.plan_id] ?? 'Unknown') : 'Free',
      }))
      setKeys(enriched)
    }
    setKeysLoading(false)
  }, [plans])

  useEffect(() => { loadPlans() }, [loadPlans])
  useEffect(() => { if (plans.length > 0) loadKeys() }, [plans, loadKeys])

  const openCreate = () => {
    setEditPlan(null)
    setForm(defaultForm)
    setShowForm(true)
  }

  const openEdit = (plan: ApiPlan) => {
    setEditPlan(plan)
    setForm({
      name: plan.name,
      slug: plan.slug,
      price_monthly: plan.price_monthly,
      price_annual: plan.price_annual,
      call_limit: plan.call_limit,
      max_keys: plan.max_keys,
      features: plan.features.length > 0 ? plan.features : [''],
      badge: plan.badge,
      tier: plan.tier,
      is_active: plan.is_active,
    })
    setShowForm(true)
  }

  const savePlan = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      ...form,
      slug: form.slug || slugify(form.name),
      features: form.features.filter(f => f.trim() !== ''),
      badge: form.badge?.trim() || null,
    }
    if (editPlan) {
      const { error } = await supabase.from('api_plans').update(payload).eq('id', editPlan.id)
      if (!error) { toast('Plan updated'); setShowForm(false); loadPlans() }
      else toast('Error: ' + error.message)
    } else {
      const { error } = await supabase.from('api_plans').insert(payload)
      if (!error) { toast('Plan created'); setShowForm(false); loadPlans() }
      else toast('Error: ' + error.message)
    }
    setSaving(false)
  }

  const deletePlan = async (id: string) => {
    const { error } = await supabase.from('api_plans').delete().eq('id', id)
    if (!error) { toast('Plan deleted'); setDeleteId(null); loadPlans() }
    else toast('Error: ' + error.message)
  }

  const toggleKeyActive = async (id: string, current: boolean) => {
    await supabase.from('api_keys').update({ is_active: !current }).eq('id', id)
    loadKeys()
    toast(current ? 'API key suspended' : 'API key activated')
  }

  const saveOverride = async () => {
    if (!overrideEmail.trim() || !overrideLimit) return
    setOverrideSaving(true)
    const limit = parseInt(overrideLimit)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', overrideEmail.trim())
      .single()

    if (!profileData) {
      setOverrideMsg('User not found')
      setOverrideSaving(false)
      return
    }

    const { error } = await supabase
      .from('api_keys')
      .update({ custom_limit: limit })
      .eq('user_id', profileData.id)

    if (!error) {
      setOverrideMsg('Override saved successfully')
      setOverrideEmail('')
      setOverrideLimit('')
    } else {
      setOverrideMsg('Error: ' + error.message)
    }
    setOverrideSaving(false)
    setTimeout(() => setOverrideMsg(''), 4000)
  }

  const addFeature = () => setForm(f => ({ ...f, features: [...f.features, ''] }))
  const removeFeature = (i: number) => setForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }))
  const updateFeature = (i: number, val: string) => setForm(f => ({ ...f, features: f.features.map((x, idx) => idx === i ? val : x) }))

  return (
    <div style={{ padding: '24px 0', paddingBottom: 64, minHeight: '100vh', background: '#F8F9FB' }}>
      <style>{`
        .plan-row:hover { background: #FAFAFA; }
        .key-row:hover { background: #FAFAFA; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #B08D57 !important; box-shadow: 0 0 0 3px rgba(176,141,87,0.12); }
        .delete-btn:hover { color: #DC2626 !important; }
        .edit-btn:hover { color: #B08D57 !important; }
      `}</style>

      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: 20, right: 20, zIndex: 9999,
              background: '#1A1916', color: '#F4F2EE',
              padding: '12px 20px', borderRadius: 10,
              fontSize: 14, fontFamily: 'Inter, sans-serif',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <Check size={14} color="#B08D57" />
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Crown size={22} color="#B08D57" />
              API Plan Management
            </h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#6B7280', marginTop: 6 }}>
              Manage pricing tiers, rate limits, and subscriber access
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={loadPlans}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', fontSize: 13, fontFamily: 'Inter, sans-serif', cursor: 'pointer', color: '#374151' }}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <button
              onClick={openCreate}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#B08D57', fontSize: 13, fontFamily: 'Inter, sans-serif', cursor: 'pointer', color: 'white', fontWeight: 600 }}
            >
              <Plus size={14} />
              New Plan
            </button>
          </div>
        </div>

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Total Subscribers', value: stats.total_subscribers, icon: Users, color: '#3B82F6' },
              { label: 'MRR', value: fmtINR(stats.mrr), icon: IndianRupee, color: '#10B981' },
              { label: 'ARR', value: fmtINR(stats.arr), icon: TrendingUp, color: '#B08D57' },
              { label: 'Most Popular', value: stats.most_popular, icon: Crown, color: '#7C3AED' },
            ].map(m => (
              <div key={m.label} style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <m.icon size={16} color={m.color} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{m.label}</span>
                </div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 22, fontWeight: 700, color: m.color, margin: 0 }}>{m.value}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: 32 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>
              API Plans ({plans.length})
            </h2>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
              <div style={{ width: 24, height: 24, border: '2px solid #B08D57', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Loading plans...
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : plans.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Key size={36} color="#D1D5DB" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#9CA3AF' }}>No plans yet. Create your first plan.</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px 100px', padding: '10px 20px', borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' }}>
                {['Plan', 'Price/mo', 'Call Limit', 'Max Keys', 'Subscribers', 'Active', 'Actions'].map(h => (
                  <span key={h} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                ))}
              </div>
              {plans.map(plan => (
                <div key={plan.id}>
                  <div
                    className="plan-row"
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px 100px', padding: '14px 20px', borderBottom: '1px solid #F9FAFB', alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
                    onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: '#111827' }}>{plan.name}</span>
                          {plan.badge && (
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: '#B08D57', background: 'rgba(176,141,87,0.1)', border: '1px solid rgba(176,141,87,0.25)', borderRadius: 4, padding: '2px 7px', textTransform: 'uppercase' }}>{plan.badge}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: TIER_COLORS[plan.tier], background: TIER_BG[plan.tier], borderRadius: 4, padding: '1px 6px', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize' }}>{plan.tier}</span>
                          <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>{plan.slug}</span>
                        </div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: plan.price_monthly === 0 ? '#10B981' : '#111827', fontWeight: 600 }}>
                      {plan.price_monthly === 0 ? 'Free' : fmtINR(plan.price_monthly)}
                    </span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#374151' }}>{fmtLimit(plan.call_limit)}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#374151' }}>{plan.max_keys}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={13} color="#6B7280" />
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#374151', fontWeight: 600 }}>{plan.subscriber_count ?? 0}</span>
                    </div>
                    <div onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => supabase.from('api_plans').update({ is_active: !plan.is_active }).eq('id', plan.id).then(() => loadPlans())}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {plan.is_active
                          ? <ToggleRight size={22} color="#10B981" />
                          : <ToggleLeft size={22} color="#D1D5DB" />}
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
                      <button className="edit-btn" onClick={() => openEdit(plan)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', transition: 'color 0.15s', padding: 4 }}>
                        <Edit2 size={15} />
                      </button>
                      <button className="delete-btn" onClick={() => setDeleteId(plan.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', transition: 'color 0.15s', padding: 4 }}>
                        <Trash2 size={15} />
                      </button>
                      {expandedPlan === plan.id ? <ChevronUp size={15} color="#9CA3AF" /> : <ChevronDown size={15} color="#9CA3AF" />}
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedPlan === plan.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '16px 20px 20px', background: '#FAFBFC', borderBottom: '1px solid #F3F4F6' }}>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Features</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {plan.features.map((f, i) => (
                              <span key={i} style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#374151', background: 'white', border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Check size={11} color="#10B981" />
                                {f}
                              </span>
                            ))}
                          </div>
                          {plan.price_annual && (
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#6B7280', marginTop: 12 }}>
                              Annual price: <strong style={{ color: '#B08D57' }}>{fmtINR(plan.price_annual)}/yr</strong>
                              {' '}({Math.round((1 - plan.price_annual / (plan.price_monthly * 12)) * 100)}% off)
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: 32 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={16} color="#B08D57" />
              Subscribers & API Keys ({keys.length})
            </h2>
            <button onClick={loadKeys} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
              <RefreshCw size={14} />
            </button>
          </div>
          {keysLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>Loading...</div>
          ) : keys.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No API keys found</div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 100px', padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                {['Key Name / Prefix', 'Plan', 'API Calls', 'Joined', 'Active', 'Actions'].map(h => (
                  <span key={h} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                ))}
              </div>
              {keys.map(k => (
                <div key={k.id} className="key-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 100px', padding: '13px 20px', borderBottom: '1px solid #F9FAFB', alignItems: 'center', transition: 'background 0.15s' }}>
                  <div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{k.name}</p>
                    <code style={{ fontFamily: 'monospace', fontSize: 11, color: '#9CA3AF' }}>{k.key_prefix}...</code>
                  </div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#B08D57', fontWeight: 600 }}>{k.plan_name}</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#374151' }}>{(k.requests_count ?? 0).toLocaleString('en-IN')}</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#9CA3AF' }}>
                    {new Date(k.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </span>
                  <button
                    onClick={() => toggleKeyActive(k.id, k.is_active)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {k.is_active
                      ? <ToggleRight size={22} color="#10B981" />
                      : <ToggleLeft size={22} color="#D1D5DB" />}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => toggleKeyActive(k.id, k.is_active)}
                      style={{
                        fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        padding: '4px 10px', borderRadius: 6, border: 'none',
                        background: k.is_active ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                        color: k.is_active ? '#DC2626' : '#059669',
                      }}
                    >
                      {k.is_active ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <ShieldCheck size={18} color="#B08D57" />
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Rate Limit Override</h2>
          </div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
            Set a custom monthly API call limit for a specific user, overriding their plan's default.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px' }}>
              <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>User Email</label>
              <input
                type="email"
                placeholder="user@example.com"
                value={overrideEmail}
                onChange={e => setOverrideEmail(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#111827', background: '#F9FAFB', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
              />
            </div>
            <div style={{ flex: '0 1 180px' }}>
              <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Custom Monthly Limit</label>
              <input
                type="number"
                placeholder="e.g. 25000"
                value={overrideLimit}
                onChange={e => setOverrideLimit(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#111827', background: '#F9FAFB', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
              />
            </div>
            <button
              onClick={saveOverride}
              disabled={overrideSaving || !overrideEmail || !overrideLimit}
              style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#B08D57', color: 'white', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (overrideSaving || !overrideEmail || !overrideLimit) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Zap size={13} />
              {overrideSaving ? 'Saving...' : 'Set Override'}
            </button>
          </div>
          {overrideMsg && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: overrideMsg.startsWith('Error') ? '#DC2626' : '#059669', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              {overrideMsg.startsWith('Error') ? <AlertCircle size={13} /> : <Check size={13} />}
              {overrideMsg}
            </p>
          )}
        </div>

      </div>

      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 520,
                background: 'white', zIndex: 1001, boxShadow: '-8px 0 48px rgba(0,0,0,0.15)',
                overflowY: 'auto', display: 'flex', flexDirection: 'column',
              }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                  {editPlan ? 'Edit Plan' : 'Create New Plan'}
                </h3>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Plan Name *</label>
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                      placeholder="e.g. Growth"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#111827', boxSizing: 'border-box', transition: 'all 0.15s' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Slug</label>
                    <input
                      value={form.slug}
                      onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                      placeholder="growth"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#6B7280', boxSizing: 'border-box', transition: 'all 0.15s' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Price/month (₹)</label>
                    <input
                      type="number"
                      value={form.price_monthly}
                      onChange={e => setForm(f => ({ ...f, price_monthly: parseInt(e.target.value) || 0 }))}
                      placeholder="0 = free"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#111827', boxSizing: 'border-box', transition: 'all 0.15s' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Annual Price ₹/yr <span style={{ color: '#9CA3AF' }}>(optional)</span></label>
                    <input
                      type="number"
                      value={form.price_annual ?? ''}
                      onChange={e => setForm(f => ({ ...f, price_annual: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="e.g. 9990"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#111827', boxSizing: 'border-box', transition: 'all 0.15s' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Monthly Call Limit</label>
                    <input
                      type="number"
                      value={form.call_limit}
                      onChange={e => setForm(f => ({ ...f, call_limit: parseInt(e.target.value) || 0 }))}
                      placeholder="0 = unlimited"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#111827', boxSizing: 'border-box', transition: 'all 0.15s' }}
                    />
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>0 = unlimited</p>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Max API Keys</label>
                    <input
                      type="number"
                      value={form.max_keys}
                      onChange={e => setForm(f => ({ ...f, max_keys: parseInt(e.target.value) || 1 }))}
                      placeholder="1"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#111827', boxSizing: 'border-box', transition: 'all 0.15s' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Plan Tier</label>
                    <select
                      value={form.tier}
                      onChange={e => setForm(f => ({ ...f, tier: e.target.value as ApiPlan['tier'] }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#111827', boxSizing: 'border-box', background: 'white', transition: 'all 0.15s' }}
                    >
                      <option value="starter">Starter</option>
                      <option value="growth">Growth</option>
                      <option value="scale">Scale</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Badge Label <span style={{ color: '#9CA3AF' }}>(optional)</span></label>
                    <input
                      value={form.badge ?? ''}
                      onChange={e => setForm(f => ({ ...f, badge: e.target.value || null }))}
                      placeholder="Most Popular"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#111827', boxSizing: 'border-box', transition: 'all 0.15s' }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: '#374151' }}>Features</label>
                    <button
                      onClick={addFeature}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#B08D57', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Plus size={12} /> Add Feature
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {form.features.map((feat, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          value={feat}
                          onChange={e => updateFeature(i, e.target.value)}
                          placeholder={`Feature ${i + 1}`}
                          style={{ flex: 1, padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#111827', transition: 'all 0.15s' }}
                        />
                        {form.features.length > 1 && (
                          <button
                            onClick={() => removeFeature(i)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 4 }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                  <button
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {form.is_active
                      ? <ToggleRight size={24} color="#10B981" />
                      : <ToggleLeft size={24} color="#D1D5DB" />}
                  </button>
                  <div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>Plan Active</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#9CA3AF', margin: 0 }}>Inactive plans won't be shown to users</p>
                  </div>
                </div>

              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: 'white' }}>
                <button
                  onClick={savePlan}
                  disabled={saving || !form.name.trim()}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: 'none', background: '#B08D57', color: 'white', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: (saving || !form.name.trim()) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Check size={14} />
                  {saving ? 'Saving...' : editPlan ? 'Save Changes' : 'Create Plan'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ padding: '11px 20px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', color: '#374151', fontFamily: 'Inter, sans-serif', fontSize: 14, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteId(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                background: 'white', borderRadius: 16, padding: 32, zIndex: 2001,
                width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={18} color="#DC2626" />
                </div>
                <div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Delete Plan</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#6B7280', margin: 0 }}>This action cannot be undone</p>
                </div>
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#374151', marginBottom: 24, lineHeight: 1.6 }}>
                Deleting this plan will not immediately affect existing subscribers. Their API keys will remain active until you manually deactivate them.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => deletePlan(deleteId)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#DC2626', color: 'white', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Delete Plan
                </button>
                <button
                  onClick={() => setDeleteId(null)}
                  style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', color: '#374151', fontFamily: 'Inter, sans-serif', fontSize: 14, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
