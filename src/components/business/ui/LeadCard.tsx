'use client';

import { motion } from 'framer-motion';
import { Copy, ExternalLink, Globe, Mail, MapPinned, Phone } from 'lucide-react';
import type { BusinessLeadRecord } from '@/hooks/useBusinessLeadRecords';
import ScoreArc from './ScoreArc';
import StatusBadge from './StatusBadge';
import styles from './DashboardPrimitives.module.css';
import { cn } from './utils';

function getBadgeVariant(status: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'closed') return 'closed' as const;
  if (normalized === 'contacted') return 'contacted' as const;
  if (normalized === 'follow up' || normalized === 'follow_up' || normalized === 'in progress' || normalized === 'in_progress') return 'progress' as const;
  return 'new' as const;
}

function normalizeStatusForSelect(status: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (['closed', 'won', 'lost'].includes(normalized)) return 'closed';
  if (['contacted', 'follow up', 'follow_up', 'in progress', 'in_progress'].includes(normalized)) return 'in progress';
  return 'new';
}

function formatMoney(value: number | null) {
  if (typeof value !== 'number') return 'Not set';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function LeadCard({
  lead,
  onCopy,
  onCopyField,
  onAddToCrm,
  onUpdateStatus,
  statusUpdating,
  crmState = 'idle',
  copied,
}: {
  lead: BusinessLeadRecord;
  onCopy: () => void;
  onCopyField?: (label: string, value: string) => void;
  onAddToCrm?: () => void;
  onUpdateStatus?: (nextStatus: string) => void;
  statusUpdating?: boolean;
  crmState?: 'idle' | 'copying' | 'copied';
  copied?: boolean;
}) {
  const score = Math.max(0, Math.min(Math.round((lead.ai_score ?? 0) / 10), 10));
  const qualitySignals = [lead.email, lead.phone, lead.website_link, lead.google_map_link, lead.city, lead.service_category].filter(Boolean).length;
  const dataQuality = qualitySignals >= 5 ? 'High data quality' : qualitySignals >= 3 ? 'Medium data quality' : 'Low data quality';

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(styles.panel, styles.panelHover, 'group p-5')}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_120px]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge variant={getBadgeVariant(lead.status)}>{lead.status ?? 'New'}</StatusBadge>
            {onUpdateStatus ? (
              <select
                value={normalizeStatusForSelect(lead.status)}
                onChange={(event) => onUpdateStatus(event.target.value)}
                disabled={Boolean(statusUpdating)}
                className="rounded-full border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-1.5 type-label uppercase text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Update lead status"
              >
                <option value="new">New</option>
                <option value="in progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            ) : null}
          </div>
          <h3 className="mt-4 type-heading text-[var(--text-primary)]">{lead.name}</h3>
          <div className="mt-2 type-label text-[var(--text-secondary)]">
            {[lead.city, lead.service_category, lead.business_type].filter(Boolean).join(' / ') || 'Lead pipeline record'}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {lead.email ? (
              <button
                type="button"
                onClick={() => onCopyField?.('Email', lead.email!)}
                className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-2 type-mono text-[var(--text-primary)] transition-colors hover:border-[var(--border-default)]"
              >
                <Mail className="h-3.5 w-3.5 text-[var(--gold-muted)]" />
                {lead.email}
              </button>
            ) : null}
            {lead.phone ? (
              <button
                type="button"
                onClick={() => onCopyField?.('Phone', lead.phone!)}
                className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-2 type-mono text-[var(--text-primary)] transition-colors hover:border-[var(--border-default)]"
              >
                <Phone className="h-3.5 w-3.5 text-[var(--gold-muted)]" />
                {lead.phone}
              </button>
            ) : null}
          </div>

          <p className="mt-4 type-body text-[var(--text-secondary)]">
            {lead.notes || lead.message || 'No notes have been added to this lead yet.'}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)]/70 p-4">
            <div className="type-subheading text-[var(--text-tertiary)]">Pipeline Value</div>
            <div className="mt-3 type-mono text-[18px] text-[var(--text-primary)]">{formatMoney(lead.deal_value)}</div>
          </div>
          <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)]/70 p-4">
            <div className="type-subheading text-[var(--text-tertiary)]">Created</div>
            <div className="mt-3 type-mono text-[18px] text-[var(--text-primary)]">
              {new Date(lead.created_at).toLocaleDateString('en-IN')}
            </div>
          </div>
          <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)]/70 p-4">
            <div className="type-subheading text-[var(--text-tertiary)]">Outreach</div>
            <div className="mt-3 type-mono text-[18px] text-[var(--text-primary)]">{lead.outreach_count ?? 0} touches</div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-4">
          <button
            type="button"
            onClick={onCopy}
            className="translate-x-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-overlay)] p-2 text-[var(--text-secondary)] opacity-0 transition-all duration-200 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] group-hover:translate-x-0 group-hover:opacity-100"
            aria-label="Copy lead"
          >
            <Copy className="h-4 w-4" />
          </button>

          <ScoreArc value={score} max={10} compact />
          <div className="type-caption text-center">{copied ? 'Copied' : 'Score'}</div>

          {onAddToCrm ? (
            <button
              type="button"
              onClick={onAddToCrm}
              disabled={crmState === 'copying'}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-2 type-label text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {crmState === 'copying' ? 'Adding…' : crmState === 'copied' ? 'In my CRM' : 'Copy to my CRM'}
            </button>
          ) : null}

          <div className="mt-auto flex flex-wrap justify-end gap-2">
            {lead.website_link ? (
              <a
                href={lead.website_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-2 type-label text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
              >
                <Globe className="h-3.5 w-3.5" />
                Website
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
            {lead.google_map_link ? (
              <a
                href={lead.google_map_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-2 type-label text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
              >
                <MapPinned className="h-3.5 w-3.5" />
                Map
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-4">
        <span className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-2 py-1 type-caption text-[var(--text-secondary)]">
          Source: {lead.source || 'Unlabeled'}
        </span>
        <span className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-2 py-1 type-caption text-[var(--text-secondary)]">
          {dataQuality}
        </span>
        {lead.budget ? (
          <span className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-2 py-1 type-caption text-[var(--text-secondary)]">
            Budget: {lead.budget}
          </span>
        ) : null}
      </div>
    </motion.article>
  );
}
