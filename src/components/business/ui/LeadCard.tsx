'use client';

import { useState } from 'react';
import { Building2, ChevronDown, ChevronUp, Copy, ExternalLink, Globe, MapPin, Phone, Star } from 'lucide-react';
import type { BusinessLeadRecord } from '@/hooks/useBusinessLeadRecords';

type CrmState = 'idle' | 'copying' | 'copied';

const STATUS_OPTIONS = ['new', 'engaged', 'proposal', 'closed', 'lost'] as const;

interface Props {
  lead: BusinessLeadRecord;
  onCopy: () => void;
  onCopyField: (label: string, value: string) => void;
  onAddToCrm: () => void;
  onUpdateStatus: (status: string) => void;
  statusUpdating: boolean;
  crmState: CrmState;
  copied: boolean;
}

function ScoreDot({ score }: { score: number | null }) {
  if (score === null) return null;
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-slate-500';
  return (
    <span className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      Score {pct}
    </span>
  );
}

function CopyChip({ label, value, onCopy }: { label: string; value: string | null; onCopy: (l: string, v: string) => void }) {
  if (!value) return null;
  return (
    <button
      onClick={() => onCopy(label, value)}
      title={`Copy ${label}`}
      className="flex items-center gap-1.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[rgba(201,165,90,0.35)] hover:text-[var(--gold-base)]"
    >
      <Copy className="h-3 w-3 opacity-60" />
      {label}
    </button>
  );
}

export default function LeadCard({ lead, onCopy, onCopyField, onAddToCrm, onUpdateStatus, statusUpdating, crmState, copied }: Props) {
  const [expanded, setExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    new: 'bg-slate-500/20 text-slate-300',
    engaged: 'bg-blue-500/20 text-blue-300',
    proposal: 'bg-amber-500/20 text-amber-300',
    closed: 'bg-emerald-500/20 text-emerald-300',
    lost: 'bg-red-500/20 text-red-300',
  };
  const statusColor = statusColors[lead.status ?? 'new'] ?? statusColors.new;

  return (
    <div className="group rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-overlay)] transition-all duration-200 hover:border-[rgba(201,165,90,0.2)] hover:shadow-[0_0_0_1px_rgba(201,165,90,0.08)]">
      {/* Header row */}
      <div className="flex items-start gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border-default)] bg-[rgba(201,165,90,0.08)] text-[var(--gold-base)]">
          <Building2 className="h-5 w-5" strokeWidth={1.5} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[var(--text-primary)] truncate">{lead.name}</span>
            {lead.service_category && (
              <span className="rounded-full border border-[var(--border-default)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
                {lead.service_category}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
              {lead.status ?? 'new'}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--text-tertiary)]">
            {lead.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {lead.city}
              </span>
            )}
            <ScoreDot score={lead.ai_score} />
            {lead.deal_value && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                ₹{lead.deal_value.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onCopy}
            title="Copy lead brief"
            className={`rounded-[8px] border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              copied
                ? 'border-[rgba(201,165,90,0.4)] bg-[rgba(201,165,90,0.12)] text-[var(--gold-base)]'
                : 'border-[var(--border-default)] bg-transparent text-[var(--text-secondary)] hover:border-[rgba(201,165,90,0.35)] hover:text-[var(--gold-base)]'
            }`}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-[var(--border-default)] px-5 pb-5 pt-4 space-y-4">
          {/* Contact chips */}
          <div className="flex flex-wrap gap-2">
            <CopyChip label="Email" value={lead.email} onCopy={onCopyField} />
            <CopyChip label="Phone" value={lead.phone} onCopy={onCopyField} />
            {lead.google_map_link && (
              <a
                href={lead.google_map_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[rgba(201,165,90,0.35)] hover:text-[var(--gold-base)]"
              >
                <MapPin className="h-3 w-3 opacity-60" />
                Maps
                <ExternalLink className="h-2.5 w-2.5 opacity-40" />
              </a>
            )}
            {lead.website_link && (
              <a
                href={lead.website_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[rgba(201,165,90,0.35)] hover:text-[var(--gold-base)]"
              >
                <Globe className="h-3 w-3 opacity-60" />
                Website
                <ExternalLink className="h-2.5 w-2.5 opacity-40" />
              </a>
            )}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-1.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[rgba(201,165,90,0.35)] hover:text-[var(--gold-base)]"
              >
                <Phone className="h-3 w-3 opacity-60" />
                Call
              </a>
            )}
          </div>

          {/* Notes */}
          {lead.notes && (
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{lead.notes}</p>
          )}

          {/* Status + CRM */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <select
              value={lead.status ?? 'new'}
              disabled={statusUpdating}
              onChange={e => onUpdateStatus(e.target.value)}
              className="rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none disabled:opacity-60"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>

            <button
              onClick={onAddToCrm}
              disabled={crmState !== 'idle'}
              className={`rounded-[8px] border px-3 py-1.5 text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                crmState === 'copied'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:border-[rgba(201,165,90,0.35)] hover:text-[var(--gold-base)]'
              }`}
            >
              {crmState === 'copying' ? 'Adding…' : crmState === 'copied' ? 'In CRM' : 'Add to CRM'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
