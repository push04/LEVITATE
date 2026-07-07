'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Ticket, Plus, Copy, Check, Loader2, Ban, RotateCw, Trash2, ExternalLink,
} from 'lucide-react'

type Invite = {
  id: string
  code: string
  business_name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  tool: 'bizharvest' | 'tenderpulse' | 'both' | 'market_pulse'
  max_tries: number
  trial_days: number | null
  is_active: boolean
  created_at: string
  first_redeemed_at: string | null
  last_used_at: string | null
  usage: { bizharvest: number; tenderpulse: number }
}

const SITE_URL = 'https://levitatelabs.online'

function inviteLinks(invite: Pick<Invite, 'tool' | 'code'>): { label: string; url: string }[] {
  const links: { label: string; url: string }[] = []
  if (invite.tool === 'bizharvest' || invite.tool === 'both') {
    links.push({ label: 'BizHarvest', url: `${SITE_URL}/tools/bizharvest?invite=${invite.code}` })
  }
  if (invite.tool === 'tenderpulse' || invite.tool === 'both') {
    links.push({ label: 'TenderPulse', url: `${SITE_URL}/tools/tenderpulse?invite=${invite.code}` })
  }
  if (invite.tool === 'market_pulse') {
    links.push({ label: 'Market Pulse', url: `${SITE_URL}/tools/market-pulse?invite=${invite.code}` })
  }
  return links
}

function trialStatusLabel(invite: Invite): string {
  const days = invite.trial_days ?? 3
  if (!invite.first_redeemed_at) return `Trial: ${days} days, not started yet`
  const expiresAtMs = new Date(invite.first_redeemed_at).getTime() + days * 86400000
  const daysLeft = Math.ceil((expiresAtMs - Date.now()) / 86400000)
  return daysLeft > 0 ? `Trial: ${daysLeft} of ${days} days left` : 'Trial: expired'
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </button>
  )
}

export default function DemoInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [justCreated, setJustCreated] = useState<Invite | null>(null)

  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [tool, setTool] = useState<'both' | 'bizharvest' | 'tenderpulse' | 'market_pulse'>('both')
  const [maxTries, setMaxTries] = useState(3)
  const [trialDays, setTrialDays] = useState(3)
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/demo-invites')
      const data = await res.json()
      setInvites(data.invites ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessName.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/demo-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName, contactName, contactEmail, contactPhone, tool, maxTries, trialDays, notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setJustCreated({ ...data.invite, usage: { bizharvest: 0, tenderpulse: 0 } })
      setBusinessName(''); setContactName(''); setContactEmail(''); setContactPhone(''); setNotes(''); setTool('both'); setMaxTries(3); setTrialDays(3)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (invite: Invite) => {
    await fetch(`/api/admin/demo-invites/${invite.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !invite.is_active }),
    })
    await load()
  }

  const handleDelete = async (invite: Invite) => {
    if (!confirm(`Delete the invite for ${invite.business_name}? This cannot be undone.`)) return
    await fetch(`/api/admin/demo-invites/${invite.id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Ticket className="h-6 w-6 text-[#B08D57]" />
        <h1 className="text-2xl font-bold text-gray-900">Demo Invites</h1>
      </div>
      <p className="text-[13px] text-gray-400 -mt-4">
        Gives a specific business a personal invite code - either a limited-try AI query demo (BizHarvest /
        TenderPulse) or a time-boxed full-access trial (Market Pulse). They enter the code, get welcomed by
        name, and are asked to purchase once their tries or trial days run out.
      </p>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-[13px] font-semibold text-gray-900 mb-4">Create a new invite</p>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            placeholder="Business name *"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-base"
            required
          />
          <input
            placeholder="Contact name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-base"
          />
          <input
            placeholder="Contact email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-base"
          />
          <input
            placeholder="Contact phone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-base"
          />
          <select value={tool} onChange={(e) => setTool(e.target.value as typeof tool)} className="rounded-lg border border-gray-200 px-3 py-2 text-base">
            <option value="both">BizHarvest + TenderPulse demos</option>
            <option value="bizharvest">BizHarvest demo only</option>
            <option value="tenderpulse">TenderPulse demo only</option>
            <option value="market_pulse">Market Pulse trial</option>
          </select>
          {tool === 'market_pulse' ? (
            <input
              type="number"
              min={1}
              placeholder="Trial length (days)"
              value={trialDays}
              onChange={(e) => setTrialDays(Number(e.target.value) || 3)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-base"
            />
          ) : (
          <input
            type="number"
            min={1}
            placeholder="Max tries per tool"
            value={maxTries}
            onChange={(e) => setMaxTries(Number(e.target.value) || 3)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-base"
          />
          )}
          <input
            placeholder="Notes (internal only)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-base sm:col-span-2"
          />
          {error && <p className="text-xs text-red-500 sm:col-span-2">{error}</p>}
          <button
            type="submit"
            disabled={saving || !businessName.trim()}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#B08D57] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? 'Creating...' : 'Create invite'}
          </button>
        </form>

        {justCreated && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-800">
              Invite created for {justCreated.business_name} - code <span className="font-mono">{justCreated.code}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {inviteLinks(justCreated).map((l) => (
                <CopyButton key={l.label} text={l.url} label={`Copy ${l.label} link`} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900">All invites ({invites.length})</p>
        </div>
        {loading ? (
          <div className="p-10 text-center text-gray-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
        ) : invites.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-400">No invites yet - create one above.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {invites.map((invite) => (
              <div key={invite.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-900">{invite.business_name}</p>
                    <span className="font-mono text-xs text-gray-400">{invite.code}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${invite.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {invite.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {invite.contact_name ? `${invite.contact_name} · ` : ''}
                    {invite.contact_email || invite.contact_phone || 'No contact on file'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {invite.tool === 'market_pulse' ? (
                      trialStatusLabel(invite)
                    ) : (
                      <>
                        {invite.tool !== 'tenderpulse' && `BizHarvest: ${invite.usage.bizharvest}/${invite.max_tries} used`}
                        {invite.tool === 'both' && ' · '}
                        {invite.tool !== 'bizharvest' && `TenderPulse: ${invite.usage.tenderpulse}/${invite.max_tries} used`}
                      </>
                    )}
                    {!invite.first_redeemed_at && ' · not opened yet'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {inviteLinks(invite).map((l) => (
                    <a
                      key={l.label}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                      title={`Open ${l.label} demo link`}
                    >
                      <ExternalLink className="h-3 w-3" /> {l.label}
                    </a>
                  ))}
                  {inviteLinks(invite).map((l) => (
                    <CopyButton key={`copy-${l.label}`} text={l.url} label="Copy" />
                  ))}
                  <button
                    onClick={() => toggleActive(invite)}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    {invite.is_active ? <Ban className="h-3 w-3" /> : <RotateCw className="h-3 w-3" />}
                    {invite.is_active ? 'Disable' : 'Re-enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(invite)}
                    className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
