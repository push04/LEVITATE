import { Check, Sparkles } from 'lucide-react';
import { cn } from './utils';

export default function PricingCard({
  name,
  description,
  price,
  priceSuffix,
  annualNote,
  features,
  featured,
  badge,
  action,
}: {
  name: string;
  description?: string | null;
  price: string;
  priceSuffix?: string;
  annualNote?: string;
  features: string[];
  featured?: boolean;
  badge?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[18px] p-6',
        featured
          ? 'gradient-border-card bg-[var(--bg-elevated)] shadow-[var(--shadow-gold)]'
          : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]'
      )}
    >
      {featured ? <div className="absolute inset-x-0 top-0 h-[3px] bg-[var(--gold-base)]" /> : null}
      {badge ? (
        <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[var(--gold-glow)] px-3 py-1 type-label text-[var(--gold-bright)]">
          <Sparkles className="h-3.5 w-3.5" />
          {badge}
        </span>
      ) : null}

      <div className="pr-24">
        <div className="type-heading text-[var(--text-primary)]">{name}</div>
        {description ? <p className="mt-3 type-body text-[var(--text-secondary)]">{description}</p> : null}
      </div>

      <div className="mt-8">
        <div className="flex items-end gap-2">
          <span className="font-serif-display text-[40px] leading-none text-[var(--text-primary)]">{price}</span>
          {priceSuffix ? <span className="pb-1 text-lg text-[var(--text-secondary)]">{priceSuffix}</span> : null}
        </div>
        {annualNote ? <div className="mt-2 type-caption">{annualNote}</div> : null}
      </div>

      <div className="mt-6 space-y-3">
        {features.map((feature) => (
          <div key={feature} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[var(--status-closed)] text-white">
              <Check className="h-3 w-3" />
            </span>
            <span className="type-body text-[var(--text-secondary)]">{feature}</span>
          </div>
        ))}
      </div>

      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}
