'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, Loader2, Zap, FileText, ToggleLeft, ToggleRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Template {
  id: string
  name: string
  subject: string
  body: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const VARIABLE_HINTS = ['{business_name}', '{category}', '{city}']

const BLANK: Omit<Template, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  subject: '',
  body: '',
  is_active: false,
}

export default function OutreachTemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editing, setEditing] = useState<Template | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState({ ...BLANK })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/outreach/templates')
      if (res.ok) setTemplates(await res.json())
    } finally { setIsLoading(false) }
  }

  function startNew() {
    setForm({ ...BLANK })
    setEditing(null)
    setIsNew(true)
  }

  function startEdit(t: Template) {
    setForm({ name: t.name, subject: t.subject, body: t.body, is_active: t.is_active })
    setEditing(t)
    setIsNew(false)
  }

  function cancelForm() {
    setEditing(null)
    setIsNew(false)
  }

  async function save() {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) return
    setSaving(true)
    try {
      if (isNew) {
        const res = await fetch('/api/admin/outreach/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) { await load(); cancelForm() }
        else { const d = await res.json(); alert(d.error) }
      } else if (editing) {
        const res = await fetch(`/api/admin/outreach/templates/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) { await load(); cancelForm() }
        else { const d = await res.json(); alert(d.error) }
      }
    } finally { setSaving(false) }
  }

  async function toggleActive(t: Template) {
    const res = await fetch(`/api/admin/outreach/templates/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !t.is_active }),
    })
    if (res.ok) await load()
  }

  async function del(id: string) {
    if (!confirm('Delete this template?')) return
    setDeleting(id)
    try {
      await fetch(`/api/admin/outreach/templates/${id}`, { method: 'DELETE' })
      await load()
    } finally { setDeleting(null) }
  }

  const activeTemplate = templates.find(t => t.is_active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Outreach Email Templates</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            The <span className="font-semibold text-[var(--primary)]">active</span> template is sent by the automated outreach agent.
            Supports variables: <code className="text-xs bg-[var(--secondary)] px-1 py-0.5 rounded">{'{business_name}'}</code>{' '}
            <code className="text-xs bg-[var(--secondary)] px-1 py-0.5 rounded">{'{category}'}</code>{' '}
            <code className="text-xs bg-[var(--secondary)] px-1 py-0.5 rounded">{'{city}'}</code>
          </p>
        </div>
        {!isNew && !editing && (
          <button
            onClick={startNew}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        )}
      </div>

      {/* Active Banner */}
      {activeTemplate && !isNew && !editing && (
        <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm">
          <Zap className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>
            <span className="font-semibold text-emerald-600">Active: </span>
            <span className="text-[var(--foreground)]">{activeTemplate.name}</span>
            <span className="text-[var(--muted)] ml-2">— AI generation is OFF while a template is active</span>
          </span>
        </div>
      )}

      {/* Form */}
      <AnimatePresence>
        {(isNew || editing) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-card p-5 space-y-4"
          >
            <h3 className="font-bold text-base">{isNew ? 'New Template' : `Edit — ${editing?.name}`}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold mb-1 text-[var(--muted)] uppercase tracking-wide">Template Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Warm intro — clinics"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                />
              </div>

              <div className="col-span-2 sm:col-span-1 flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-[var(--border)]'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm font-medium">Set as active</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--muted)] uppercase tracking-wide">Subject Line</label>
              <input
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. AI follow-ups for {business_name}"
                className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Email Body</label>
                <div className="flex gap-1">
                  {VARIABLE_HINTS.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, body: f.body + v }))}
                      className="text-xs px-1.5 py-0.5 rounded bg-[var(--secondary)] border border-[var(--border)] hover:border-[var(--primary)] transition-colors font-mono"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={10}
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder={`Hi {business_name},\n\nI noticed that many {category}s in {city} lose leads simply because no one follows up fast enough...\n\nWould a free 15-min demo be useful?\n\nPushpal Sanyal | Founder, Levitate Labs | levitatelabs.online`}
                className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none font-mono leading-relaxed"
              />
              <p className="text-xs text-[var(--muted)] mt-1">{form.body.split(/\s+/).filter(Boolean).length} words</p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={cancelForm} className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--secondary)] transition-colors flex items-center gap-1.5">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.name.trim() || !form.subject.trim() || !form.body.trim()}
                className="px-5 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template List */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--muted)] py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading templates...
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl">
          <FileText className="w-8 h-8 text-[var(--muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--muted)]">No templates yet. Create one to override AI generation.</p>
          <p className="text-xs text-[var(--muted)] mt-1">Without a template, outreach uses AI to write each email.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className={`glass-card p-4 transition-all ${t.is_active ? 'border-emerald-500/40' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {t.is_active && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 mt-0.5" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{t.name}</span>
                      {t.is_active && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-medium flex-shrink-0">Active</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-0.5 truncate">Subject: {t.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                    className="p-1.5 hover:bg-[var(--secondary)] rounded-md transition-colors text-xs text-[var(--muted)]"
                    title="Preview"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleActive(t)}
                    title={t.is_active ? 'Deactivate' : 'Set active'}
                    className={`p-1.5 rounded-md transition-colors ${t.is_active ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-[var(--muted)] hover:bg-[var(--secondary)]'}`}
                  >
                    {t.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => startEdit(t)}
                    className="p-1.5 hover:bg-[var(--secondary)] rounded-md transition-colors text-[var(--muted)]"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => del(t.id)}
                    disabled={deleting === t.id}
                    className="p-1.5 hover:bg-red-500/10 rounded-md transition-colors text-red-400 disabled:opacity-40"
                    title="Delete"
                  >
                    {deleting === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {expanded === t.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-[var(--border)]">
                      <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-2">Preview</p>
                      <pre className="text-xs leading-relaxed text-[var(--foreground)] whitespace-pre-wrap font-sans bg-[var(--secondary)]/40 rounded-lg p-3 max-h-48 overflow-y-auto">{t.body}</pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
