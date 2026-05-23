'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { registerResearchRun } from '@/components/business/BusinessResearchRunProvider';
import {
  BUSINESS_MODEL_OPTIONS,
  COMPANY_STAGE_OPTIONS,
  INDUSTRY_OPTIONS,
  LEGAL_ENTITY_OPTIONS,
  REGION_OPTIONS,
  RESEARCH_INTENT_OPTIONS,
  RESEARCH_MODULES,
  SALES_CHANNEL_OPTIONS,
  TEAM_SIZE_OPTIONS,
  type BusinessProfilePayload,
  type ResearchIntentPayload,
  type ResearchModuleId,
} from '@/lib/business-intelligence';
import { useBusinessResearchQuota } from '@/hooks/useBusinessResearchQuota';

const EMPTY_PROFILE: BusinessProfilePayload = {
  businessName: '',
  oneLineDescription: '',
  industry: '',
  subIndustry: '',
  businessModelType: 'other',
  primaryGeographies: [],
  companyStage: 'idea_stage',
  teamSizeRange: 'solo',
  registrationStatus: 'other',
  isMsmeRegistered: false,
  annualRevenueBracket: '',
  primarySalesChannels: [],
  preferredTimezone: 'Asia/Kolkata',
};

const EMPTY_INTENT: ResearchIntentPayload = {
  intentType: 'market',
  targetName: '',
  targetUrl: '',
  notes: '',
};

const STEP_TITLES = [
  'Business identity',
  'Stage and scale',
  'Research intent',
  'Modules and run',
] as const;

function fieldClassName(invalid: boolean) {
  return `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${
    invalid
      ? 'border-[rgba(171,80,80,0.65)] bg-[rgba(72,27,27,0.24)] text-[var(--foreground)] placeholder:text-[rgba(241,160,160,0.78)] focus:border-[rgba(191,94,94,0.8)]'
      : 'border-[var(--border)] bg-[var(--background)] focus:border-[#c8a96e]'
  }`;
}

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
        active
          ? 'border-[#c8a96e]/30 bg-[#c8a96e]/10 text-[#e5c487]'
          : 'border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]'
      }`}
    >
      {label}
    </button>
  );
}

export default function ResearchWorkspace() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<BusinessProfilePayload>(EMPTY_PROFILE);
  const [intent, setIntent] = useState<ResearchIntentPayload>(EMPTY_INTENT);
  const [selectedModules, setSelectedModules] = useState<ResearchModuleId[]>(RESEARCH_MODULES.map(module => module.id));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const quota = useBusinessResearchQuota(true);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const response = await fetch('/api/business/profile', { cache: 'no-store' });
        const data = await response.json();
        if (active && response.ok && data?.success && data.data) {
          setProfile({ ...EMPTY_PROFILE, ...data.data });
        } else if (active) {
          setProfile(prev => ({
            ...prev,
            preferredTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || prev.preferredTimezone,
          }));
        }
      } catch (error) {
        console.error('Unable to preload business profile', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const updateMissingState = (field: string) => {
    setMissingFields(previous => previous.filter(item => item !== field));
  };

  const getStepMissingFields = (currentStep: number) => {
    if (currentStep === 0) {
      return [
        !profile.businessName.trim() ? 'businessName' : null,
        !profile.industry.trim() ? 'industry' : null,
      ].filter(Boolean) as string[];
    }

    if (currentStep === 1) {
      return [
        !profile.companyStage ? 'companyStage' : null,
        !profile.teamSizeRange ? 'teamSizeRange' : null,
        !profile.registrationStatus ? 'registrationStatus' : null,
      ].filter(Boolean) as string[];
    }

    if (currentStep === 2) {
      return [
        !intent.intentType ? 'intentType' : null,
        !intent.targetName.trim() ? 'targetName' : null,
      ].filter(Boolean) as string[];
    }

    return selectedModules.length === 0 ? ['selectedModules'] : [];
  };

  const handleContinue = () => {
    const nextMissingFields = getStepMissingFields(step);
    setMissingFields(nextMissingFields);

    if (nextMissingFields.length > 0) {
      setMessage('Complete the mandatory fields marked in red before continuing.');
      return;
    }

    setMessage('');
    setStep(prev => prev + 1);
  };

  const runReport = async () => {
    const nextMissingFields = getStepMissingFields(step);
    setMissingFields(nextMissingFields);

    if (nextMissingFields.length > 0) {
      setMessage('Complete the mandatory fields marked in red before generating the report.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || profile.preferredTimezone || 'Asia/Kolkata';
      const profilePayload = { ...profile, preferredTimezone: timezone };

      await fetch('/api/business/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload),
      });

      const response = await fetch('/api/business/research/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: profilePayload,
          intent,
          selectedModules,
          timeZone: timezone,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to create report');
      }

      registerResearchRun(data.data.id, 600);
      window.dispatchEvent(new Event('business-research-quota-refresh'));
      router.push(`/business/dashboard/reports/${data.data.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to generate report');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--muted)]">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#c8a96e]" />
        <div className="mt-4">Loading saved business context…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="inline-flex rounded-full border border-[#c8a96e]/30 bg-[#c8a96e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#e5c487]">
              Market Research
            </div>
            <h1 className="mt-4 text-3xl font-bold text-[var(--foreground)]">Subscriber intelligence workspace</h1>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              Capture your business context once, choose what you want to research, and generate a full LevitateOS market intelligence report with module-by-module output.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/75 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Daily quota</div>
            <div className="mt-1 text-2xl font-bold text-[var(--foreground)]">
              {quota.loading ? '…' : quota.remaining}
            </div>
            <div className="text-sm text-[var(--muted)]">
              {quota.loading ? 'Checking availability' : `${quota.remaining} left today`}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {STEP_TITLES.map((title, index) => (
            <div key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/75 p-4">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${index <= step ? 'bg-[#c8a96e] text-[#140f07]' : 'bg-[var(--secondary)] text-[var(--muted)]'}`}>
                {index + 1}
              </div>
              <div className="mt-3 text-sm font-semibold text-[var(--foreground)]">{title}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        {step === 0 ? (
          <div className="grid gap-4">
            <input
              value={profile.businessName}
              onChange={event => {
                setProfile(prev => ({ ...prev, businessName: event.target.value }));
                updateMissingState('businessName');
              }}
              placeholder="Business name"
              className={fieldClassName(missingFields.includes('businessName'))}
            />
            <textarea
              value={profile.oneLineDescription}
              onChange={event => setProfile(prev => ({ ...prev, oneLineDescription: event.target.value }))}
              placeholder="What does the business do in one line?"
              rows={3}
              className={fieldClassName(false)}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={profile.industry}
                onChange={event => {
                  setProfile(prev => ({ ...prev, industry: event.target.value }));
                  updateMissingState('industry');
                }}
                className={fieldClassName(missingFields.includes('industry'))}
              >
                <option value="">Select industry</option>
                {INDUSTRY_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                value={profile.subIndustry}
                onChange={event => setProfile(prev => ({ ...prev, subIndustry: event.target.value }))}
                placeholder="Sub-industry"
                className={fieldClassName(false)}
              />
            </div>
            <select
              value={profile.businessModelType}
              onChange={event => setProfile(prev => ({ ...prev, businessModelType: event.target.value as BusinessProfilePayload['businessModelType'] }))}
              className={fieldClassName(false)}
            >
              {BUSINESS_MODEL_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div>
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Primary geographies</div>
              <div className="flex flex-wrap gap-2">
                {REGION_OPTIONS.map(option => (
                  <ToggleChip
                    key={option}
                    label={option}
                    active={profile.primaryGeographies.includes(option)}
                    onClick={() =>
                      setProfile(prev => ({
                        ...prev,
                        primaryGeographies: prev.primaryGeographies.includes(option)
                          ? prev.primaryGeographies.filter(value => value !== option)
                          : [...prev.primaryGeographies, option],
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4">
            <select
              value={profile.companyStage}
              onChange={event => {
                setProfile(prev => ({ ...prev, companyStage: event.target.value as BusinessProfilePayload['companyStage'] }));
                updateMissingState('companyStage');
              }}
              className={fieldClassName(missingFields.includes('companyStage'))}
            >
              {COMPANY_STAGE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={profile.teamSizeRange}
              onChange={event => {
                setProfile(prev => ({ ...prev, teamSizeRange: event.target.value as BusinessProfilePayload['teamSizeRange'] }));
                updateMissingState('teamSizeRange');
              }}
              className={fieldClassName(missingFields.includes('teamSizeRange'))}
            >
              {TEAM_SIZE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={profile.registrationStatus}
              onChange={event => {
                setProfile(prev => ({ ...prev, registrationStatus: event.target.value as BusinessProfilePayload['registrationStatus'] }));
                updateMissingState('registrationStatus');
              }}
              className={fieldClassName(missingFields.includes('registrationStatus'))}
            >
              {LEGAL_ENTITY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              value={profile.annualRevenueBracket}
              onChange={event => setProfile(prev => ({ ...prev, annualRevenueBracket: event.target.value }))}
              placeholder="Annual revenue bracket"
              className={fieldClassName(false)}
            />
            <label className="inline-flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={profile.isMsmeRegistered}
                onChange={event => setProfile(prev => ({ ...prev, isMsmeRegistered: event.target.checked }))}
              />
              MSME registered
            </label>
            <div>
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Primary sales channels</div>
              <div className="flex flex-wrap gap-2">
                {SALES_CHANNEL_OPTIONS.map(option => (
                  <ToggleChip
                    key={option}
                    label={option}
                    active={profile.primarySalesChannels.includes(option)}
                    onClick={() =>
                      setProfile(prev => ({
                        ...prev,
                        primarySalesChannels: prev.primarySalesChannels.includes(option)
                          ? prev.primarySalesChannels.filter(value => value !== option)
                          : [...prev.primarySalesChannels, option],
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4">
            <select
              value={intent.intentType}
              onChange={event => {
                setIntent(prev => ({ ...prev, intentType: event.target.value as ResearchIntentPayload['intentType'] }));
                updateMissingState('intentType');
              }}
              className={fieldClassName(missingFields.includes('intentType'))}
            >
              {RESEARCH_INTENT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              value={intent.targetName}
              onChange={event => {
                setIntent(prev => ({ ...prev, targetName: event.target.value }));
                updateMissingState('targetName');
              }}
              placeholder="Target business, market keyword, or product category"
              className={fieldClassName(missingFields.includes('targetName'))}
            />
            <input
              value={intent.targetUrl}
              onChange={event => setIntent(prev => ({ ...prev, targetUrl: event.target.value }))}
              placeholder="Optional website URL"
              className={fieldClassName(false)}
            />
            <textarea
              value={intent.notes}
              onChange={event => setIntent(prev => ({ ...prev, notes: event.target.value }))}
              placeholder="Any additional notes about what you want to understand"
              rows={5}
              className={fieldClassName(false)}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#c8a96e]/20 bg-[#c8a96e]/8 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-[#e5c487]" />
                <div>
                  <div className="font-semibold text-[var(--foreground)]">Quota-aware generation</div>
                  <div className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    LevitateOS will reserve one of your five daily report generations as soon as you start this run.
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {RESEARCH_MODULES.map(module => {
                const active = selectedModules.includes(module.id);
                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() =>
                      setSelectedModules(prev => {
                        updateMissingState('selectedModules');
                        return prev.includes(module.id)
                          ? prev.filter(value => value !== module.id)
                          : [...prev, module.id];
                      })
                    }
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      active
                        ? 'border-[#c8a96e]/30 bg-[#c8a96e]/10'
                        : missingFields.includes('selectedModules')
                          ? 'border-[rgba(171,80,80,0.65)] bg-[rgba(72,27,27,0.24)]'
                          : 'border-[var(--border)] bg-[var(--background)]/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-semibold text-[var(--foreground)]">{module.title}</div>
                      <div className={`h-4 w-4 rounded-full border ${active ? 'border-[#c8a96e] bg-[#c8a96e]' : 'border-[var(--border)] bg-transparent'}`} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{module.description}</p>
                  </button>
                );
              })}
            </div>
            {missingFields.includes('selectedModules') ? (
              <div className="text-sm text-[#f1a0a0]">Select at least one module before generating the report.</div>
            ) : null}
          </div>
        ) : null}

        {message ? (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {message}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[var(--muted)]">
            Step {step + 1} of {STEP_TITLES.length}
          </div>
          <div className="flex flex-wrap gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(prev => prev - 1)}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[#c8a96e]/40 hover:text-[#e5c487]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : null}
            {step < STEP_TITLES.length - 1 ? (
              <button
                type="button"
                onClick={handleContinue}
                className="inline-flex items-center gap-2 rounded-xl bg-[#c8a96e] px-4 py-2.5 text-sm font-semibold text-[#140f07] transition-transform hover:-translate-y-0.5"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={runReport}
                disabled={submitting || quota.remaining <= 0}
                className="inline-flex items-center gap-2 rounded-xl bg-[#c8a96e] px-4 py-2.5 text-sm font-semibold text-[#140f07] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate report
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
