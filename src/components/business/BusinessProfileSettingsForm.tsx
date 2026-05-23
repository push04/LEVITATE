'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import {
  BUSINESS_MODEL_OPTIONS,
  COMPANY_STAGE_OPTIONS,
  INDUSTRY_OPTIONS,
  LEGAL_ENTITY_OPTIONS,
  REGION_OPTIONS,
  SALES_CHANNEL_OPTIONS,
  TEAM_SIZE_OPTIONS,
  type BusinessProfilePayload,
} from '@/lib/business-intelligence';

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

function TogglePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
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
      {children}
    </button>
  );
}

export default function BusinessProfileSettingsForm() {
  const [form, setForm] = useState<BusinessProfilePayload>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const response = await fetch('/api/business/profile', { cache: 'no-store' });
        const data = await response.json();
        if (active && response.ok && data?.success && data.data) {
          setForm({ ...EMPTY_PROFILE, ...data.data });
        }
      } catch (error) {
        console.error('Failed to load business profile', error);
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

  const summary = useMemo(() => {
    return [
      form.businessName || 'Business name not set',
      form.industry || 'Industry not set',
      form.businessModelType,
      form.primaryGeographies.join(', ') || 'Geography not set',
    ].join(' • ');
  }, [form]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/business/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to save business profile');
      }

      setMessage('Business profile saved. This context will prefill future research sessions.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save business profile');
    } finally {
      setSaving(false);
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-[#c8a96e]/30 bg-[#c8a96e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#e5c487]">
              Profile Settings
            </div>
            <h1 className="mt-4 text-3xl font-bold text-[var(--foreground)]">Saved business context</h1>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              LevitateOS uses this profile to personalize research reports relative to your own business instead of returning generic category analysis.
            </p>
            <div className="mt-4 text-sm text-[var(--muted)]">{summary}</div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c8a96e] px-5 py-3 text-sm font-semibold text-[#140f07] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save profile
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)]">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Business identity</div>
            <div className="mt-3 grid gap-4">
              <input
                value={form.businessName}
                onChange={event => setForm(prev => ({ ...prev, businessName: event.target.value }))}
                placeholder="Business name"
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[#c8a96e]"
              />
              <textarea
                value={form.oneLineDescription}
                onChange={event => setForm(prev => ({ ...prev, oneLineDescription: event.target.value }))}
                placeholder="One-line description"
                rows={3}
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[#c8a96e]"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <select
                  value={form.industry}
                  onChange={event => setForm(prev => ({ ...prev, industry: event.target.value }))}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[#c8a96e]"
                >
                  <option value="">Select industry</option>
                  {INDUSTRY_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <input
                  value={form.subIndustry}
                  onChange={event => setForm(prev => ({ ...prev, subIndustry: event.target.value }))}
                  placeholder="Sub-industry"
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[#c8a96e]"
                />
              </div>
              <select
                value={form.businessModelType}
                onChange={event => setForm(prev => ({ ...prev, businessModelType: event.target.value as BusinessProfilePayload['businessModelType'] }))}
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[#c8a96e]"
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
                    <TogglePill
                      key={option}
                      active={form.primaryGeographies.includes(option)}
                      onClick={() =>
                        setForm(prev => ({
                          ...prev,
                          primaryGeographies: prev.primaryGeographies.includes(option)
                            ? prev.primaryGeographies.filter(value => value !== option)
                            : [...prev.primaryGeographies, option],
                        }))
                      }
                    >
                      {option}
                    </TogglePill>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Stage and scale</div>
            <div className="mt-3 grid gap-4">
              <select
                value={form.companyStage}
                onChange={event => setForm(prev => ({ ...prev, companyStage: event.target.value as BusinessProfilePayload['companyStage'] }))}
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[#c8a96e]"
              >
                {COMPANY_STAGE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={form.teamSizeRange}
                onChange={event => setForm(prev => ({ ...prev, teamSizeRange: event.target.value as BusinessProfilePayload['teamSizeRange'] }))}
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[#c8a96e]"
              >
                {TEAM_SIZE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={form.registrationStatus}
                onChange={event => setForm(prev => ({ ...prev, registrationStatus: event.target.value as BusinessProfilePayload['registrationStatus'] }))}
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[#c8a96e]"
              >
                {LEGAL_ENTITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={form.annualRevenueBracket}
                onChange={event => setForm(prev => ({ ...prev, annualRevenueBracket: event.target.value }))}
                placeholder="Annual revenue bracket"
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[#c8a96e]"
              />
              <input
                value={form.preferredTimezone}
                onChange={event => setForm(prev => ({ ...prev, preferredTimezone: event.target.value }))}
                placeholder="Preferred timezone"
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[#c8a96e]"
              />
              <label className="inline-flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={form.isMsmeRegistered}
                  onChange={event => setForm(prev => ({ ...prev, isMsmeRegistered: event.target.checked }))}
                />
                MSME registered
              </label>
              <div>
                <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Primary sales channels</div>
                <div className="flex flex-wrap gap-2">
                  {SALES_CHANNEL_OPTIONS.map(option => (
                    <TogglePill
                      key={option}
                      active={form.primarySalesChannels.includes(option)}
                      onClick={() =>
                        setForm(prev => ({
                          ...prev,
                          primarySalesChannels: prev.primarySalesChannels.includes(option)
                            ? prev.primarySalesChannels.filter(value => value !== option)
                            : [...prev.primarySalesChannels, option],
                        }))
                      }
                    >
                      {option}
                    </TogglePill>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
