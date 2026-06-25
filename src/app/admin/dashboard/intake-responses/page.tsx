'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, ChevronDown, Mail, Phone, Globe, Copy, Check,
  MessageSquare, Sparkles, BarChart2, Calendar, ExternalLink,
  RefreshCw, Download, ChevronRight, ChevronLeft, Link2,
  Plus, Building2, Tag, MapPin, FileText, Trash2, Eye,
  MousePointerClick, ArrowUpRight, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SERVICES } from '@/lib/groq/prompts';
import { type IntakeSubmission, type LeadTier, type ServiceCategory } from '@/lib/types/intake';

// ── Types ─────────────────────────────────────────────────────────────────

interface IntakeLink {
  id: string;
  token: string;
  company_name: string | null;
  company_website: string | null;
  company_type: string | null;
  company_city: string | null;
  admin_notes: string | null;
  view_count: number;
  submit_count: number;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────

const STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost'] as const;

const STATUS_COLORS: Record<string, string> = {
  new:           'bg-blue-100 text-blue-700 border-blue-200',
  contacted:     'bg-yellow-100 text-yellow-700 border-yellow-200',
  qualified:     'bg-purple-100 text-purple-700 border-purple-200',
  proposal_sent: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  converted:     'bg-green-100 text-green-700 border-green-200',
  lost:          'bg-gray-100 text-gray-500 border-gray-200',
};

const TIER_COLORS: Record<LeadTier, string> = {
  hot:  'bg-red-100 text-red-700 border-red-200',
  warm: 'bg-amber-100 text-amber-700 border-amber-200',
  cold: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  social_media: 'bg-blue-100 text-blue-800',
  marketplace:  'bg-amber-100 text-amber-800',
  pr:           'bg-purple-100 text-purple-800',
  lead_gen:     'bg-green-100 text-green-800',
  analytics:    'bg-teal-100 text-teal-800',
  reputation:   'bg-rose-100 text-rose-800',
  support:      'bg-gray-100 text-gray-700',
};

const COMPANY_TYPES = [
  'E-commerce / D2C', 'Retail / Physical Store', 'SaaS / Tech',
  'Agency / Consultancy', 'Manufacturing', 'Healthcare / Clinic',
  'Real Estate', 'Education / Coaching', 'Hospitality / Restaurant',
  'Professional Services', 'Other',
];

const PAGE_SIZE = 20;

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(date: string) {
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function serviceBySlug(slug: string) {
  return SERVICES.find(s => s.slug === slug);
}
function getBaseUrl() {
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://levitatelabs.online';
}

// ── Copy button ────────────────────────────────────────────────────────────

function CopyBtn({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className={`p-1 rounded text-gray-400 hover:text-gray-600 transition-colors ${className}`}
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Tier badge ─────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: LeadTier | null }) {
  if (!tier) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wide ${TIER_COLORS[tier]}`}>
      {tier}
    </span>
  );
}

// ── Score bar ──────────────────────────────────────────────────────────────

function ScoreBar({ score, tier }: { score: number | null; tier: LeadTier | null }) {
  if (!score) return <span className="text-xs text-gray-400">—</span>;
  const color = tier === 'hot' ? 'bg-red-500' : tier === 'warm' ? 'bg-amber-500' : 'bg-cyan-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono font-bold text-gray-700 tabular-nums w-7 text-right">{score}</span>
    </div>
  );
}

// ── Generate Link Modal ────────────────────────────────────────────────────

function GenerateLinkModal({ onClose, onCreated }: { onClose: () => void; onCreated: (link: IntakeLink) => void }) {
  const [form, setForm] = useState({
    companyName: '', companyWebsite: '', companyType: '', companyCity: '', adminNotes: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState<IntakeLink | null>(null);
  const [copied, setCopied] = useState(false);

  const generatedUrl = created ? `${getBaseUrl()}/intake?ref=${created.token}` : '';

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/admin/intake-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setCreated(data.data);
        onCreated(data.data);
      }
    } catch {}
    setIsCreating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="fixed z-50 inset-0 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">Generate Intake Link</h2>
                <p className="text-violet-200 text-sm mt-0.5">
                  Create a personalised intake link to share with a prospect
                </p>
              </div>
              <button onClick={onClose} className="text-violet-300 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {!created ? (
              <>
                <div className="space-y-4">
                  {/* Company name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      <Building2 className="w-3.5 h-3.5 inline mr-1" />
                      Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sharma Electronics Pvt Ltd"
                      value={form.companyName}
                      onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Website */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        <Globe className="w-3.5 h-3.5 inline mr-1" />
                        Website / Handle
                      </label>
                      <input
                        type="text"
                        placeholder="website.com"
                        value={form.companyWebsite}
                        onChange={e => setForm(f => ({ ...f, companyWebsite: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        <MapPin className="w-3.5 h-3.5 inline mr-1" />
                        City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mumbai"
                        value={form.companyCity}
                        onChange={e => setForm(f => ({ ...f, companyCity: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      <Tag className="w-3.5 h-3.5 inline mr-1" />
                      Business Type
                    </label>
                    <select
                      value={form.companyType}
                      onChange={e => setForm(f => ({ ...f, companyType: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none bg-white transition-all"
                    >
                      <option value="">Select type…</option>
                      {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      <FileText className="w-3.5 h-3.5 inline mr-1" />
                      Internal Notes <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      placeholder="e.g. Met at Shark Tank event, interested in marketplace launch…"
                      value={form.adminNotes}
                      onChange={e => setForm(f => ({ ...f, adminNotes: e.target.value }))}
                      rows={2}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold transition-all shadow-lg shadow-violet-500/25 disabled:opacity-60"
                >
                  {isCreating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  ) : (
                    <><Link2 className="w-4 h-4" /> Generate Personalised Link</>
                  )}
                </button>
              </>
            ) : (
              /* Success state */
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Link created!</p>
                    <p className="text-xs text-gray-500">Ready to share with {created.company_name || 'prospect'}</p>
                  </div>
                </div>

                {/* The link */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Shareable Link</p>
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                    <Link2 className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span className="text-sm text-gray-700 flex-1 truncate font-mono">{generatedUrl}</span>
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                        copied
                          ? 'bg-green-100 text-green-700'
                          : 'bg-violet-600 text-white hover:bg-violet-700'
                      }`}
                    >
                      {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                </div>

                {/* Quick share options */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Hi! Here's your personalised growth plan from Levitate Labs:\n${generatedUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all text-xs font-medium text-gray-600"
                  >
                    <svg className="w-5 h-5 text-green-500 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    WhatsApp
                  </a>
                  <a
                    href={`mailto:?subject=Your personalised growth plan from Levitate Labs&body=Hi,%0D%0A%0D%0AHere's your personalised intake link:%0D%0A${encodeURIComponent(generatedUrl)}%0D%0A%0D%0APlease take 3 minutes to complete the form and we'll follow up with a tailored proposal.%0D%0A%0D%0ARegards,%0D%0ALevitate Labs`}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-xs font-medium text-gray-600"
                  >
                    <Mail className="w-5 h-5 text-blue-500" />
                    Email
                  </a>
                  <button
                    onClick={() => { setCreated(null); setForm({ companyName: '', companyWebsite: '', companyType: '', companyCity: '', adminNotes: '' }); }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-all text-xs font-medium text-gray-600"
                  >
                    <Plus className="w-5 h-5 text-violet-500" />
                    New Link
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Lead Drawer ────────────────────────────────────────────────────────────

function LeadDrawer({ lead, onClose, onStatusChange }: {
  lead: IntakeSubmission;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [convOpen, setConvOpen] = useState(false);
  const [status, setStatus] = useState(lead.status);
  const [saving, setSaving] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    setStatus(newStatus);
    await supabase.from('intake_submissions').update({ status: newStatus }).eq('id', lead.id);
    onStatusChange(lead.id, newStatus);
    setSaving(false);
  };

  const selectedServices = (lead.selected_service_slugs ?? []).map(slug => {
    const svc = serviceBySlug(slug);
    return svc ?? { slug, name: slug, category: 'support' as ServiceCategory };
  });

  const recommendedSlugs = new Set(lead.recommended_service_slugs ?? []);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[640px] bg-white shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{lead.business_name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <TierBadge tier={lead.ai_lead_tier} />
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[status] ?? STATUS_COLORS.new}`}>
                {status.replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-400">{fmt(lead.created_at)} · {fmtTime(lead.created_at)}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors shrink-0">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Contact info */}
          <section className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Contact</p>
            <div className="space-y-1.5 text-sm">
              <p className="font-semibold text-gray-900">{lead.contact_name}</p>
              {lead.email && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                  <a href={`mailto:${lead.email}`} className="hover:text-violet-600 truncate">{lead.email}</a>
                  <CopyBtn text={lead.email} />
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Phone className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                  <a href={`tel:${lead.phone}`} className="hover:text-violet-600">{lead.phone}</a>
                  <CopyBtn text={lead.phone} />
                </div>
              )}
              {lead.website && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Globe className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                  <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-violet-600 truncate flex items-center gap-1">
                    {lead.website} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {lead.referral && (
                <p className="text-xs text-gray-500">Heard via: <span className="font-medium text-gray-700">{lead.referral}</span></p>
              )}
            </div>
          </section>

          {/* Status management */}
          <section>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={saving}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    status === s
                      ? (STATUS_COLORS[s] ?? '') + ' ring-2 ring-offset-1 ring-current/30'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400 bg-white'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </section>

          {/* AI Intelligence */}
          {(lead.ai_qualification_summary || lead.ai_recommendation_reason || lead.ai_lead_score !== null) && (
            <section className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100 p-5 space-y-4">
              <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Intelligence
              </p>

              {lead.ai_lead_score !== null && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">Lead Score</p>
                    <TierBadge tier={lead.ai_lead_tier} />
                  </div>
                  <ScoreBar score={lead.ai_lead_score} tier={lead.ai_lead_tier} />
                </div>
              )}

              {lead.ai_qualification_summary && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Qualification Summary</p>
                  <p className="text-sm text-gray-800 leading-relaxed bg-white/70 rounded-lg p-3">{lead.ai_qualification_summary}</p>
                </div>
              )}

              {lead.ai_recommendation_reason && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Recommendation Rationale</p>
                  <p className="text-sm text-gray-700 italic">{lead.ai_recommendation_reason}</p>
                </div>
              )}

              {lead.ai_proposal_snippet && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">Suggested Outreach Message</p>
                    <CopyBtn text={lead.ai_proposal_snippet} />
                  </div>
                  <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-indigo-100 leading-relaxed">
                    {lead.ai_proposal_snippet}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Selected services */}
          {selectedServices.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Selected Services ({selectedServices.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedServices.map(svc => (
                  <span
                    key={svc.slug}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                      CATEGORY_COLORS[svc.category as ServiceCategory] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {recommendedSlugs.has(svc.slug) && <Sparkles className="w-2.5 h-2.5" />}
                    {svc.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Qualification conversation */}
          {(lead.qualification_messages ?? []).length > 0 && (
            <section>
              <button
                onClick={() => setConvOpen(v => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors w-full py-2"
              >
                <MessageSquare className="w-4 h-4 text-gray-400" />
                Qualification Conversation
                <span className="text-xs text-gray-400 font-normal ml-1">({(lead.qualification_messages ?? []).length} messages)</span>
                <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${convOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {convOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-3 max-h-80 overflow-y-auto pr-1 border border-gray-100 rounded-xl p-3 bg-gray-50">
                      {(lead.qualification_messages ?? []).map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.role === 'assistant' ? (
                            <div className="flex items-end gap-2 max-w-[85%]">
                              <div className="w-5 h-5 rounded-full bg-indigo-700 flex items-center justify-center shrink-0">
                                <span className="text-[7px] text-white font-bold">AI</span>
                              </div>
                              <div className="px-3 py-2 bg-white border border-gray-200 rounded-2xl rounded-tl-sm text-sm text-gray-800">
                                {msg.content}
                              </div>
                            </div>
                          ) : (
                            <div className="max-w-[85%] px-3 py-2 bg-violet-600 text-white rounded-2xl rounded-tr-sm text-sm">
                              {msg.content}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ── Links Tab ──────────────────────────────────────────────────────────────

function LinksTab({ links, onRefresh }: { links: IntakeLink[]; onRefresh: () => void }) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCopy = (token: string) => {
    const url = `${getBaseUrl()}/intake?ref=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1800);
  };

  const handleDelete = async (token: string) => {
    if (!confirm('Delete this link? Existing submissions from this link will remain.')) return;
    setDeleting(token);
    await fetch(`/api/admin/intake-links?token=${token}`, { method: 'DELETE' });
    onRefresh();
    setDeleting(null);
  };

  if (links.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Link2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
        <p className="text-gray-500 text-sm font-medium">No intake links yet</p>
        <p className="text-gray-400 text-xs mt-1">Generate a personalised link above and share it with prospects.</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
              <th className="px-4 py-3 text-left">Company</th>
              <th className="px-4 py-3 text-left">Link</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-center">Submits</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {links.map(link => (
              <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">{link.company_name || '—'}</p>
                  {link.company_city && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {link.company_city}
                    </p>
                  )}
                  {link.admin_notes && (
                    <p className="text-xs text-gray-400 italic truncate max-w-[180px]" title={link.admin_notes}>{link.admin_notes}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">
                      /intake?ref={link.token}
                    </code>
                    <button
                      onClick={() => handleCopy(link.token)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                        copiedToken === link.token
                          ? 'bg-green-100 text-green-700'
                          : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                      }`}
                    >
                      {copiedToken === link.token ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                    <a
                      href={`/intake?ref=${link.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-gray-400 hover:text-violet-600 transition-colors"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {link.company_type ? (
                    <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-semibold">
                      {link.company_type}
                    </span>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <MousePointerClick className="w-3.5 h-3.5" /> {link.submit_count}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {fmt(link.created_at)}
                  </div>
                  {link.created_by && <p className="truncate max-w-[120px]">{link.created_by}</p>}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(link.token)}
                    disabled={deleting === link.token}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete link"
                  >
                    {deleting === link.token ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-100">
        {links.map(link => (
          <div key={link.id} className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-semibold text-gray-900">{link.company_name || 'Unnamed link'}</p>
                {link.company_type && (
                  <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-semibold">
                    {link.company_type}
                  </span>
                )}
              </div>
              <button onClick={() => handleDelete(link.token)} className="p-1.5 text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-[11px] bg-gray-100 px-2 py-1 rounded text-gray-600 flex-1 truncate">
                /intake?ref={link.token}
              </code>
              <button onClick={() => handleCopy(link.token)} className="shrink-0 px-3 py-1.5 rounded-lg bg-violet-100 text-violet-700 text-xs font-medium">
                {copiedToken === link.token ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{link.submit_count} submit{link.submit_count !== 1 ? 's' : ''} · {fmt(link.created_at)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function IntakeResponsesPage() {
  const [submissions, setSubmissions] = useState<IntakeSubmission[]>([]);
  const [links, setLinks] = useState<IntakeLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<IntakeSubmission | null>(null);
  const [activeTab, setActiveTab] = useState<'responses' | 'links'>('responses');
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [page, setPage] = useState(0);

  const fetchSubmissions = useCallback(async () => {
    const { data, error: dbErr } = await supabase
      .from('intake_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    if (dbErr) {
      setError(dbErr.code === '42P01'
        ? 'Table not found — run intake_schema.sql in Supabase first.'
        : dbErr.message);
    } else {
      setSubmissions((data ?? []) as IntakeSubmission[]);
    }
  }, []);

  const fetchLinks = useCallback(async () => {
    const res = await fetch('/api/admin/intake-links').catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setLinks(data.data ?? []);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([fetchSubmissions(), fetchLinks()]);
    setIsLoading(false);
  }, [fetchSubmissions, fetchLinks]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const total     = submissions.length;
  const hot       = submissions.filter(s => s.ai_lead_tier === 'hot').length;
  const warm      = submissions.filter(s => s.ai_lead_tier === 'warm').length;
  const converted = submissions.filter(s => s.status === 'converted').length;

  const filtered = submissions.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.business_name.toLowerCase().includes(q) || s.contact_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchTier   = tierFilter === 'all' || s.ai_lead_tier === tierFilter;
    return matchSearch && matchStatus && matchTier;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleStatusChange = (id: string, status: string) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const exportCSV = () => {
    const headers = ['Business', 'Contact', 'Email', 'Phone', 'Website', 'Tier', 'Score', 'Status', 'Services', 'Referral', 'Date'];
    const rows = filtered.map(s => [
      s.business_name, s.contact_name, s.email,
      s.phone ?? '', s.website ?? '',
      s.ai_lead_tier ?? '', s.ai_lead_score ?? '',
      s.status,
      (s.selected_service_slugs ?? []).join('; '),
      s.referral ?? '', fmt(s.created_at),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'intake_responses.csv'; a.click();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intake Responses</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI-qualified leads from the intake form</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-violet-500/25"
          >
            <Link2 className="w-4 h-4" /> Generate Link
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Responses', value: total,     icon: BarChart2, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Hot Leads',       value: hot,       icon: Sparkles,  color: 'text-red-500',    bg: 'bg-red-50'    },
          { label: 'Warm Leads',      value: warm,      icon: Sparkles,  color: 'text-amber-500',  bg: 'bg-amber-50'  },
          { label: 'Converted',       value: converted, icon: Check,     color: 'text-emerald-500', bg: 'bg-emerald-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{label}</span>
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit gap-1">
        {(['responses', 'links'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all capitalize flex items-center gap-2 ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'responses' ? <BarChart2 className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
            {tab === 'responses' ? `Responses (${total})` : `Links (${links.length})`}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Responses tab */}
      {activeTab === 'responses' && !error && (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by business, contact, or email…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none bg-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-violet-500"
            >
              <option value="all">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select
              value={tierFilter}
              onChange={e => { setTierFilter(e.target.value); setPage(0); }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-violet-500"
            >
              <option value="all">All Tiers</option>
              <option value="hot">🔴 Hot</option>
              <option value="warm">🟡 Warm</option>
              <option value="cold">🔵 Cold</option>
            </select>
          </div>

          <div className="glass-card overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-violet-500" />
                <p className="text-gray-400 text-sm">Loading responses…</p>
              </div>
            ) : paginated.length === 0 ? (
              <div className="p-12 text-center">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p className="text-gray-500 text-sm font-medium">No responses yet</p>
                <p className="text-gray-400 text-xs mt-1">Share your intake link with prospects to start collecting leads.</p>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-500">
                  <Link2 className="w-3.5 h-3.5" />
                  <code>/intake</code> or use a generated link above
                </div>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                        <th className="px-4 py-3 text-left">Business</th>
                        <th className="px-4 py-3 text-left">Contact</th>
                        <th className="px-4 py-3 text-left">Tier</th>
                        <th className="px-4 py-3 text-left w-32">Score</th>
                        <th className="px-4 py-3 text-left">Services</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginated.map(sub => (
                        <tr
                          key={sub.id}
                          onClick={() => setSelected(sub)}
                          className="hover:bg-violet-50/50 cursor-pointer transition-colors group"
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900 truncate max-w-[160px] group-hover:text-violet-700 transition-colors">{sub.business_name}</p>
                            {sub.website && <p className="text-xs text-gray-400 truncate max-w-[160px]">{sub.website}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-700">{sub.contact_name}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[160px]">{sub.email}</p>
                          </td>
                          <td className="px-4 py-3"><TierBadge tier={sub.ai_lead_tier} /></td>
                          <td className="px-4 py-3 w-32"><ScoreBar score={sub.ai_lead_score} tier={sub.ai_lead_tier} /></td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-500">{(sub.selected_service_slugs ?? []).length} selected</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[sub.status] ?? STATUS_COLORS.new}`}>
                              {sub.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {fmt(sub.created_at)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-gray-100">
                  {paginated.map(sub => (
                    <div key={sub.id} onClick={() => setSelected(sub)} className="p-4 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{sub.business_name}</p>
                          <p className="text-xs text-gray-400">{sub.contact_name} · {sub.email}</p>
                        </div>
                        <TierBadge tier={sub.ai_lead_tier} />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[sub.status] ?? STATUS_COLORS.new}`}>
                          {sub.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-400">{fmt(sub.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Links tab */}
      {activeTab === 'links' && !error && (
        <LinksTab links={links} onRefresh={fetchLinks} />
      )}

      {/* Lead drawer */}
      <AnimatePresence>
        {selected && (
          <LeadDrawer lead={selected} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} />
        )}
      </AnimatePresence>

      {/* Generate link modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <GenerateLinkModal
            onClose={() => setShowGenerateModal(false)}
            onCreated={link => { setLinks(prev => [link, ...prev]); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
