'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Download, FileText, Gavel, Link2, Loader2, Sparkles } from 'lucide-react';
import {
  DELAYED_PAYMENT_OPTIONS,
  LEGAL_ENTITY_OPTIONS,
  legalNoticeToPlainText,
  type AdvisorInput,
  type LegalNoticeDraft,
  type LegalNoticeIntake,
} from '@/lib/business-intelligence';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import GoldButton from '@/components/business/ui/GoldButton';
import Toast from '@/components/business/ui/Toast';
import styles from '@/components/business/ui/DashboardPrimitives.module.css';
import { cn } from '@/components/business/ui/utils';

const TRANSACTION_NATURE_OPTIONS = [
  'Service agreement',
  'Product sale',
  'Software development contract',
  'Consulting engagement',
  'Freelance work',
  'Supply of goods',
  'Other',
] as const;

const BREACH_TYPE_OPTIONS = [
  'Non-payment',
  'Non-delivery',
  'Non-performance',
  'Deficiency of service',
  'Cheque dishonour',
  'Breach of contractual terms',
] as const;

const NOTICE_OBJECTIVES = [
  'Pay the outstanding amount',
  'Perform a specific obligation',
  'Stop an infringing activity',
  'Pay and perform',
] as const;

const EMPTY_NOTICE: LegalNoticeIntake = {
  senderName: '',
  senderAddress: '',
  senderContact: '',
  senderEntityType: 'private_limited',
  recipientName: '',
  recipientAddress: '',
  recipientContact: '',
  recipientEntityType: 'private_limited',
  transactionNature: 'Service agreement',
  hasFormalContract: true,
  agreedTerms: '',
  agreementDate: '',
  breachType: 'Non-payment',
  principalAmount: '',
  agreedInterest: '',
  defaultPeriod: '',
  priorCommunications: '',
  partialPayments: '',
  missedDeadlines: '',
  noticeObjective: 'Pay the outstanding amount',
  advocateDetails: '',
};

const EMPTY_ADVISOR: AdvisorInput = {
  amountBand: 'below_1_lakh',
  hasWrittenContract: false,
  hadCheque: false,
  otherPartyIsRegisteredCompany: false,
  isMsmeRegistered: false,
};

type DraftSectionKey = keyof LegalNoticeDraft['sections'];
type MessageTone = 'neutral' | 'warn';

const DRAFT_SECTION_META: Array<{ key: DraftSectionKey; label: string }> = [
  { key: 'header', label: 'Formal Header' },
  { key: 'facts', label: 'Facts and Chronology' },
  { key: 'legalGrounds', label: 'Applicable Indian Legal Grounds' },
  { key: 'demand', label: 'Specific Legal Demand' },
  { key: 'deadline', label: 'Deadline for Compliance' },
  { key: 'consequences', label: 'Consequences of Non-Compliance' },
  { key: 'closing', label: 'Closing and Signature Block' },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function fieldClassName(invalid: boolean) {
  return cn(
    'w-full rounded-[10px] border px-4 py-3 text-sm outline-none transition-all duration-150',
    invalid
      ? 'border-[rgba(171,80,80,0.65)] bg-[rgba(72,27,27,0.24)] text-[var(--text-primary)] placeholder:text-[rgba(228,178,178,0.72)] focus:border-[rgba(191,94,94,0.75)] focus:shadow-[0_0_0_3px_rgba(171,80,80,0.18)]'
      : 'border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--gold-glow)]'
  );
}

function FormField({
  label,
  field,
  missingFields,
  required = false,
  helper,
  children,
}: {
  label: string;
  field: keyof LegalNoticeIntake;
  missingFields: Array<keyof LegalNoticeIntake>;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  const invalid = missingFields.includes(field);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className={`type-label uppercase ${invalid ? 'text-[#f1a0a0]' : 'text-[var(--text-secondary)]'}`}>{label}</label>
        {required ? (
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
              invalid
                ? 'border-[rgba(171,80,80,0.5)] bg-[rgba(171,80,80,0.14)] text-[#f1a0a0]'
                : 'border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-tertiary)]'
            }`}
          >
            Mandatory
          </span>
        ) : null}
      </div>
      {children}
      {invalid ? (
        <p className="mt-2 text-[11px] leading-5 text-[#f1a0a0]">This mandatory field has not been filled yet.</p>
      ) : helper ? (
        <p className="mt-2 type-caption">{helper}</p>
      ) : null}
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${styles.panel} p-5`}>
      <div className="flex items-center gap-4">
        <div className="type-subheading text-[var(--text-tertiary)]">{title}</div>
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>
      <p className="mt-3 type-body text-[var(--text-secondary)]">{description}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function ToggleQuestion({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className={`${styles.panel} p-4`}>
      <div className="type-body text-[var(--text-primary)]">{label}</div>
      <div className="mt-3 flex gap-2">
        {[true, false].map((option) => (
          <button
            key={String(option)}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full border px-3 py-1.5 type-label uppercase ${
              value === option
                ? 'border-[var(--border-strong)] bg-[var(--gold-glow)] text-[var(--gold-bright)]'
                : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
            }`}
          >
            {option ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );
}

function getMissingFields(intake: LegalNoticeIntake) {
  const missing = new Set<keyof LegalNoticeIntake>();

  const requireValue = (field: keyof LegalNoticeIntake) => {
    if (!String(intake[field] ?? '').trim()) {
      missing.add(field);
    }
  };

  requireValue('senderName');
  requireValue('senderAddress');
  requireValue('senderContact');
  requireValue('recipientName');
  requireValue('recipientAddress');
  requireValue('recipientContact');
  requireValue('agreementDate');
  requireValue('agreedTerms');
  requireValue('defaultPeriod');

  if (['Non-payment', 'Cheque dishonour'].includes(intake.breachType)) {
    requireValue('principalAmount');
  }

  return Array.from(missing);
}

export default function LegalToolsWorkspace() {
  const portal = useCompanyPortalState();
  const [intake, setIntake] = useState<LegalNoticeIntake>(EMPTY_NOTICE);
  const [draft, setDraft] = useState<LegalNoticeDraft | null>(null);
  const [draftRecordId, setDraftRecordId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageTone>('neutral');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'copied'>('idle');
  const [copyState, setCopyState] = useState('Copy to Clipboard');
  const [activeSection, setActiveSection] = useState<DraftSectionKey | null>(null);
  const [advisorInput, setAdvisorInput] = useState<AdvisorInput>(EMPTY_ADVISOR);
  const [advisorCards, setAdvisorCards] = useState<Array<{ title: string; body: string }>>([]);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [missingFields, setMissingFields] = useState<Array<keyof LegalNoticeIntake>>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (!portal.loading && portal.companyName && intake.senderName === '') {
      setIntake((previous) => ({ ...previous, senderName: portal.companyName }));
    }
  }, [intake.senderName, portal.companyName, portal.loading]);

  const sectionEntries = useMemo(() => {
    if (!draft) {
      return [];
    }

    return DRAFT_SECTION_META.map(({ key, label }) => ({
      key,
      label,
      value: draft.sections[key],
    }));
  }, [draft]);

  const requiresAmount = ['Non-payment', 'Cheque dishonour'].includes(intake.breachType);

  const showToast = (nextMessage: string) => {
    setToastMessage(nextMessage);
    setToastVisible(true);
    window.setTimeout(() => setToastVisible(false), 2200);
  };

  const updateIntake = <Key extends keyof LegalNoticeIntake>(key: Key, value: LegalNoticeIntake[Key]) => {
    setIntake((previous) => ({ ...previous, [key]: value }));
    setMissingFields((previous) => previous.filter((field) => field !== key));
  };

  const generateDraft = async () => {
    const nextMissingFields = getMissingFields(intake);
    setMissingFields(nextMissingFields);

    if (nextMissingFields.length > 0) {
      setMessageTone('warn');
      setMessage('Complete the red mandatory fields before generating the legal notice.');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageTone('neutral');

    try {
      const response = await fetch('/api/business/legal/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intake),
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to draft legal notice');
      }

      setDraft(data.data.draft);
      setDraftRecordId(data.data.id ?? null);
      setActiveSection('facts');
      setMessage('Legal notice draft generated. Click any section in the preview to refine the language before export.');
      setMessageTone('neutral');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to draft legal notice');
      setMessageTone('warn');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!draft) {
      return;
    }

    setExporting(format);
    setMessage('');
    setMessageTone('neutral');

    try {
      const response = await fetch('/api/business/legal/notices/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, draft }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Unable to export ${format.toUpperCase()}`);
      }

      const blob = await response.blob();
      downloadBlob(blob, `levitate-legal-notice.${format}`);
      showToast(`${format.toUpperCase()} export downloaded`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to export ${format.toUpperCase()}`);
      setMessageTone('warn');
    } finally {
      setExporting(null);
    }
  };

  const handleCopy = async () => {
    if (!draft) {
      return;
    }

    try {
      await navigator.clipboard.writeText(legalNoticeToPlainText(draft));
      setCopyState('Copied');
      showToast('Legal notice copied');
      window.setTimeout(() => setCopyState('Copy to Clipboard'), 1800);
    } catch (error) {
      console.error('Failed to copy legal notice', error);
      setCopyState('Copy failed');
      window.setTimeout(() => setCopyState('Copy to Clipboard'), 1800);
    }
  };

  const handleShare = async () => {
    if (!draftRecordId) {
      return;
    }

    setShareState('loading');

    try {
      const response = await fetch(`/api/business/legal/notices/${draftRecordId}/share`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to share legal notice');
      }

      await navigator.clipboard.writeText(data.data.url);
      setShareState('copied');
      showToast('Legal notice backlink copied');
      window.setTimeout(() => setShareState('idle'), 1800);
    } catch (error) {
      setShareState('idle');
      setMessage(error instanceof Error ? error.message : 'Unable to share legal notice');
      setMessageTone('warn');
    }
  };

  const loadAdvisor = async () => {
    setAdvisorLoading(true);
    setMessage('');
    setMessageTone('neutral');

    try {
      const response = await fetch('/api/business/legal/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(advisorInput),
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to load advisor recommendation');
      }

      setAdvisorCards(data.data ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load advisor recommendation');
      setMessageTone('warn');
    } finally {
      setAdvisorLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <section className={`${styles.panel} p-6 md:p-8`}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--gold-glow)] px-3 py-1 type-label uppercase text-[var(--gold-bright)]">
                <Gavel className="h-3.5 w-3.5" />
                Legal Tools
              </div>
              <h1 className="mt-5 type-hero text-[var(--text-primary)]">Payment recovery drafting with a calmer, more serious legal workspace</h1>
              <p className="mt-4 max-w-3xl type-body text-[var(--text-secondary)]">
                Draft India-aware notices, review the route before escalation, and edit the finished document in a paper-like preview that feels closer to real legal preparation than a chat output.
              </p>
            </div>

            <div className={`${styles.panel} bg-[linear-gradient(135deg,rgba(201,165,90,0.08)_0%,rgba(201,165,90,0.02)_72%)] p-5`}>
              <div className="type-subheading text-[var(--text-tertiary)]">Drafting standard</div>
              <div className="mt-3 type-heading text-[var(--text-primary)]">Indian law grounded</div>
              <p className="mt-3 type-body text-[var(--text-secondary)]">
                Contract Act, NI Act, MSME recovery, CPC, arbitration, insolvency, and consumer-route considerations are all preserved in the downstream drafting prompt.
              </p>
              <div className="mt-4 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)]/70 p-4">
                <div className="type-label uppercase text-[var(--text-tertiary)]">Form behavior</div>
                <p className="mt-2 type-body text-[var(--text-secondary)]">
                  Mandatory fields turn red until completed so the drafter fails early on the form, not after submission.
                </p>
              </div>
            </div>
          </div>
        </section>

        {message ? (
          <div
            className={`rounded-[14px] border px-4 py-3 type-body ${
              messageTone === 'warn'
                ? 'border-[rgba(171,80,80,0.45)] bg-[rgba(171,80,80,0.16)] text-[var(--text-primary)]'
                : 'border-[var(--border-default)] bg-[var(--gold-glow)] text-[var(--text-primary)]'
            }`}
          >
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.06fr)_minmax(460px,0.94fr)]">
          <div className="space-y-6">
            <section className={`${styles.panel} p-5 md:p-6`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="type-title text-[var(--text-primary)]">Legal Notice Drafter</div>
                  <p className="mt-2 type-body text-[var(--text-secondary)]">
                    Complete the intake once, then review the drafted sections in the preview pane before exporting.
                  </p>
                </div>
                <div className="rounded-full border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-2 type-caption uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  AI-assisted, counsel-reviewed
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <FormSection
                  title="Sender Details"
                  description="Identify the business or individual issuing the notice exactly as it should appear in the legal header."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Sender name" field="senderName" missingFields={missingFields} required>
                      <input
                        value={intake.senderName}
                        onChange={(event) => updateIntake('senderName', event.target.value)}
                        placeholder="LEVITATE LABS"
                        className={fieldClassName(missingFields.includes('senderName'))}
                      />
                    </FormField>

                    <FormField label="Sender entity type" field="senderEntityType" missingFields={missingFields}>
                      <select
                        value={intake.senderEntityType}
                        onChange={(event) => updateIntake('senderEntityType', event.target.value as LegalNoticeIntake['senderEntityType'])}
                        className={fieldClassName(false)}
                      >
                        {LEGAL_ENTITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <FormField label="Sender address" field="senderAddress" missingFields={missingFields} required>
                    <textarea
                      value={intake.senderAddress}
                      onChange={(event) => updateIntake('senderAddress', event.target.value)}
                      placeholder="Full postal address of the sender"
                      rows={3}
                      className={fieldClassName(missingFields.includes('senderAddress'))}
                    />
                  </FormField>

                  <FormField label="Sender contact details" field="senderContact" missingFields={missingFields} required>
                    <input
                      value={intake.senderContact}
                      onChange={(event) => updateIntake('senderContact', event.target.value)}
                      placeholder="Phone number, email, and relevant contact details"
                      className={fieldClassName(missingFields.includes('senderContact'))}
                    />
                  </FormField>
                </FormSection>

                <FormSection
                  title="Recipient Details"
                  description="Capture the opposite party exactly as they should be addressed in the legal notice."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Recipient name" field="recipientName" missingFields={missingFields} required>
                      <input
                        value={intake.recipientName}
                        onChange={(event) => updateIntake('recipientName', event.target.value)}
                        placeholder="Recipient or debtor name"
                        className={fieldClassName(missingFields.includes('recipientName'))}
                      />
                    </FormField>

                    <FormField label="Recipient entity type" field="recipientEntityType" missingFields={missingFields}>
                      <select
                        value={intake.recipientEntityType}
                        onChange={(event) => updateIntake('recipientEntityType', event.target.value as LegalNoticeIntake['recipientEntityType'])}
                        className={fieldClassName(false)}
                      >
                        {LEGAL_ENTITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <FormField label="Recipient address" field="recipientAddress" missingFields={missingFields} required>
                    <textarea
                      value={intake.recipientAddress}
                      onChange={(event) => updateIntake('recipientAddress', event.target.value)}
                      placeholder="Registered office or known address of the recipient"
                      rows={3}
                      className={fieldClassName(missingFields.includes('recipientAddress'))}
                    />
                  </FormField>

                  <FormField label="Recipient contact details" field="recipientContact" missingFields={missingFields} required>
                    <input
                      value={intake.recipientContact}
                      onChange={(event) => updateIntake('recipientContact', event.target.value)}
                      placeholder="Known phone number, email, or contact person"
                      className={fieldClassName(missingFields.includes('recipientContact'))}
                    />
                  </FormField>
                </FormSection>

                <FormSection
                  title="Transaction and Breach"
                  description="Give the drafter enough factual chronology to build a notice that reads like a legal brief, not a generic template."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Transaction nature" field="transactionNature" missingFields={missingFields}>
                      <select
                        value={intake.transactionNature}
                        onChange={(event) => updateIntake('transactionNature', event.target.value)}
                        className={fieldClassName(false)}
                      >
                        {TRANSACTION_NATURE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label="Agreement date" field="agreementDate" missingFields={missingFields} required>
                      <input
                        type="date"
                        value={intake.agreementDate}
                        onChange={(event) => updateIntake('agreementDate', event.target.value)}
                        className={fieldClassName(missingFields.includes('agreementDate'))}
                      />
                    </FormField>
                  </div>

                  <label className="inline-flex items-center gap-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-4 py-3 text-sm text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={intake.hasFormalContract}
                      onChange={(event) => updateIntake('hasFormalContract', event.target.checked)}
                    />
                    Formal written contract exists
                  </label>

                  <FormField
                    label="Key agreed terms"
                    field="agreedTerms"
                    missingFields={missingFields}
                    required
                    helper="Summarise scope, deliverables, payment promises, deadlines, and any interest clause."
                  >
                    <textarea
                      value={intake.agreedTerms}
                      onChange={(event) => updateIntake('agreedTerms', event.target.value)}
                      placeholder="Scope of work, delivery milestones, payment timelines, and any written commitments"
                      rows={4}
                      className={fieldClassName(missingFields.includes('agreedTerms'))}
                    />
                  </FormField>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Breach type" field="breachType" missingFields={missingFields}>
                      <select
                        value={intake.breachType}
                        onChange={(event) => updateIntake('breachType', event.target.value)}
                        className={fieldClassName(false)}
                      >
                        {BREACH_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label="Notice objective" field="noticeObjective" missingFields={missingFields}>
                      <select
                        value={intake.noticeObjective}
                        onChange={(event) => updateIntake('noticeObjective', event.target.value)}
                        className={fieldClassName(false)}
                      >
                        {NOTICE_OBJECTIVES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                </FormSection>

                <FormSection
                  title="Amount, Default, and Prior Follow-up"
                  description="Add the commercial details that usually decide whether the remedy should lean civil, MSME, NI Act, or insolvency-led."
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      label="Principal amount"
                      field="principalAmount"
                      missingFields={missingFields}
                      required={requiresAmount}
                      helper={requiresAmount ? undefined : 'Optional when the dispute is non-monetary.'}
                    >
                      <input
                        value={intake.principalAmount}
                        onChange={(event) => updateIntake('principalAmount', event.target.value)}
                        placeholder="100000"
                        className={fieldClassName(missingFields.includes('principalAmount'))}
                      />
                    </FormField>

                    <FormField label="Agreed interest" field="agreedInterest" missingFields={missingFields}>
                      <input
                        value={intake.agreedInterest}
                        onChange={(event) => updateIntake('agreedInterest', event.target.value)}
                        placeholder="18 percent per annum"
                        className={fieldClassName(false)}
                      />
                    </FormField>

                    <FormField label="Period of default" field="defaultPeriod" missingFields={missingFields} required>
                      <input
                        value={intake.defaultPeriod}
                        onChange={(event) => updateIntake('defaultPeriod', event.target.value)}
                        placeholder="Since 01 January 2026"
                        className={fieldClassName(missingFields.includes('defaultPeriod'))}
                      />
                    </FormField>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Prior communications" field="priorCommunications" missingFields={missingFields}>
                      <textarea
                        value={intake.priorCommunications}
                        onChange={(event) => updateIntake('priorCommunications', event.target.value)}
                        placeholder="Emails, WhatsApp reminders, demand calls, or earlier notices already sent"
                        rows={3}
                        className={fieldClassName(false)}
                      />
                    </FormField>

                    <FormField label="Partial payments and missed deadlines" field="partialPayments" missingFields={missingFields}>
                      <textarea
                        value={`${intake.partialPayments}${intake.missedDeadlines ? `\n${intake.missedDeadlines}` : ''}`}
                        onChange={(event) => {
                          const [partial, ...rest] = event.target.value.split('\n');
                          updateIntake('partialPayments', partial);
                          updateIntake('missedDeadlines', rest.join('\n'));
                        }}
                        placeholder="Record any part-payment received and deadlines that were already given and ignored"
                        rows={3}
                        className={fieldClassName(false)}
                      />
                    </FormField>
                  </div>

                  <FormField label="Advocate details" field="advocateDetails" missingFields={missingFields}>
                    <textarea
                      value={intake.advocateDetails}
                      onChange={(event) => updateIntake('advocateDetails', event.target.value)}
                      placeholder="Optional advocate name, firm, office address, and enrolment reference"
                      rows={3}
                      className={fieldClassName(false)}
                    />
                  </FormField>
                </FormSection>

                <div className="flex flex-col gap-3 rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-overlay)]/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="type-label uppercase text-[var(--text-tertiary)]">Ready to draft</div>
                    <p className="mt-2 type-body text-[var(--text-secondary)]">
                      Mandatory fields are checked first so the notice generator receives a cleaner factual brief.
                    </p>
                  </div>
                  <GoldButton
                    type="button"
                    onClick={generateDraft}
                    disabled={loading}
                    iconLeft={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  >
                    Generate legal notice
                  </GoldButton>
                </div>
              </div>
            </section>

            <section className={`${styles.panel} p-5 md:p-6`}>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-[var(--gold-base)]" />
                <div>
                  <h2 className="type-title text-[var(--text-primary)]">What Can You Do About Delayed Payments?</h2>
                  <p className="mt-1 type-body text-[var(--text-secondary)]">
                    Always-on guidance for Indian business owners, organised by practical route and expected timeline.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                {DELAYED_PAYMENT_OPTIONS.map((option) => (
                  <article key={option.id} className={`${styles.panel} p-4`}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <h3 className="type-heading text-[var(--text-primary)]">{option.title}</h3>
                        <p className="mt-3 type-body text-[var(--text-secondary)]">{option.explanation}</p>
                      </div>
                      <span className="rounded-full border border-[var(--border-strong)] bg-[var(--gold-glow)] px-3 py-1 type-label uppercase text-[var(--gold-bright)]">
                        {option.recommendedFor}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)]/70 p-4">
                        <div className="type-subheading text-[var(--text-tertiary)]">Applicable laws or forum</div>
                        <div className="mt-2 type-body text-[var(--text-primary)]">{option.laws}</div>
                      </div>
                      <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)]/70 p-4">
                        <div className="type-subheading text-[var(--text-tertiary)]">Typical timeline</div>
                        <div className="mt-2 type-body text-[var(--text-primary)]">{option.timeline}</div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={`${styles.panel} p-5 md:p-6`}>
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-[var(--gold-base)]" />
                <div>
                  <h2 className="type-title text-[var(--text-primary)]">Situational Advisor</h2>
                  <p className="mt-1 type-body text-[var(--text-secondary)]">
                    Answer five quick questions and get a recommended next step before escalating further.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className={`${styles.panel} p-4`}>
                  <div className="type-body text-[var(--text-primary)]">Amount owed</div>
                  <div className="mt-3 flex gap-2">
                    {[
                      ['below_1_lakh', 'Below 1 lakh'],
                      ['above_1_lakh', 'Above 1 lakh'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAdvisorInput((previous) => ({ ...previous, amountBand: value as AdvisorInput['amountBand'] }))}
                        className={`rounded-full border px-3 py-1.5 type-label uppercase ${
                          advisorInput.amountBand === value
                            ? 'border-[var(--border-strong)] bg-[var(--gold-glow)] text-[var(--gold-bright)]'
                            : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <ToggleQuestion
                  label="Do you have a written contract or agreement?"
                  value={advisorInput.hasWrittenContract}
                  onChange={(next) => setAdvisorInput((previous) => ({ ...previous, hasWrittenContract: next }))}
                />
                <ToggleQuestion
                  label="Was any cheque issued?"
                  value={advisorInput.hadCheque}
                  onChange={(next) => setAdvisorInput((previous) => ({ ...previous, hadCheque: next }))}
                />
                <ToggleQuestion
                  label="Is the other party a registered company?"
                  value={advisorInput.otherPartyIsRegisteredCompany}
                  onChange={(next) => setAdvisorInput((previous) => ({ ...previous, otherPartyIsRegisteredCompany: next }))}
                />
                <ToggleQuestion
                  label="Are you MSME registered?"
                  value={advisorInput.isMsmeRegistered}
                  onChange={(next) => setAdvisorInput((previous) => ({ ...previous, isMsmeRegistered: next }))}
                />

                <GoldButton
                  type="button"
                  onClick={loadAdvisor}
                  disabled={advisorLoading}
                  iconLeft={advisorLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                >
                  Recommend next step
                </GoldButton>

                {advisorCards.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    {advisorCards.map((card) => (
                      <div key={card.title} className="rounded-[14px] border border-[var(--border-strong)] bg-[var(--gold-glow)] p-4">
                        <div className="type-heading text-[var(--text-primary)]">{card.title}</div>
                        <p className="mt-3 type-body text-[var(--text-secondary)]">{card.body}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="space-y-6 2xl:sticky 2xl:top-6 2xl:self-start">
            <section className={`${styles.panel} p-5 md:p-6`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex rounded-full border border-[var(--border-strong)] bg-[var(--gold-glow)] px-3 py-1 type-label uppercase text-[var(--gold-bright)]">
                    Notice Preview
                  </div>
                  <h2 className="mt-4 type-title text-[var(--text-primary)]">Editable court-style preview</h2>
                  <p className="mt-2 type-body text-[var(--text-secondary)]">
                    Each section is editable in place so the final document can be tightened before you copy or export it.
                  </p>
                </div>
                <FileText className="h-8 w-8 text-[var(--gold-base)]" />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <GoldButton type="button" variant="secondary" onClick={handleCopy} disabled={!draft} iconLeft={<Copy className="h-4 w-4" />}>
                  {copyState}
                </GoldButton>
                <GoldButton
                  type="button"
                  variant="secondary"
                  onClick={handleShare}
                  disabled={!draft || !draftRecordId || shareState === 'loading'}
                  iconLeft={
                    shareState === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : shareState === 'copied' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )
                  }
                >
                  {shareState === 'loading' ? 'Creating backlink...' : shareState === 'copied' ? 'Link copied' : 'Share draft'}
                </GoldButton>
                <GoldButton
                  type="button"
                  onClick={() => handleExport('docx')}
                  disabled={!draft || exporting !== null}
                  iconLeft={exporting === 'docx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                >
                  DOCX
                </GoldButton>
                <GoldButton
                  type="button"
                  variant="ghost"
                  onClick={() => handleExport('pdf')}
                  disabled={!draft || exporting !== null}
                  iconLeft={exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                >
                  PDF
                </GoldButton>
              </div>

              <div className={cn(styles.paper, 'mt-6 p-6 md:p-8')}>
                {draft ? (
                  <div className="space-y-5 text-[#1a1712]">
                    <div className="border-b border-black/10 pb-5 text-center">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45">Legal document preview</div>
                      <div className="mt-3 font-serif-display text-3xl tracking-[0.04em]">{draft.title}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.18em] text-black/55">
                        Click any section below to edit it directly
                      </div>
                    </div>

                    {sectionEntries.map((section) => (
                      <div
                        key={section.key}
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveSection(section.key)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setActiveSection(section.key);
                          }
                        }}
                        className={`rounded-[14px] border px-4 py-4 transition-colors ${
                          activeSection === section.key ? 'border-[#d2a24f] bg-[#fff7ea]' : 'border-black/10 bg-white/70'
                        }`}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55">{section.label}</div>
                        {activeSection === section.key ? (
                          <textarea
                            value={section.value}
                            onChange={(event) =>
                              setDraft((previous) =>
                                previous
                                  ? {
                                      ...previous,
                                      sections: {
                                        ...previous.sections,
                                        [section.key]: event.target.value,
                                      },
                                    }
                                  : previous
                              )
                            }
                            rows={Math.max(6, section.value.split('\n').length + 1)}
                            className="mt-3 w-full resize-y border-none bg-transparent text-sm leading-7 text-[#1a1712] outline-none"
                          />
                        ) : (
                          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#1a1712]">{section.value}</div>
                        )}
                      </div>
                    ))}

                    <div className="pt-4 text-right text-[11px] uppercase tracking-[0.18em] text-black/38">
                      Prepared in LevitateOS legal workspace
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[620px] flex-col items-center justify-center text-center text-[#1a1712]">
                    <FileText className="h-10 w-10 text-black/30" />
                    <div className="mt-4 font-serif-display text-2xl">No draft generated yet</div>
                    <p className="mt-3 max-w-md text-sm leading-7 text-black/58">
                      Complete the intake on the left and generate the notice. The finished draft will appear here in a paper-style preview ready for edits and export.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <Toast visible={toastVisible} message={toastMessage} />
    </>
  );
}
