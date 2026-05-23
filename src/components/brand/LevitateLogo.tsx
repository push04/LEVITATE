import { useId } from 'react';

type ClassValue = string | false | null | undefined;

function cx(...values: ClassValue[]) {
  return values.filter(Boolean).join(' ');
}

type IconProps = {
  className?: string;
  title?: string;
};

export function LevitateMark({ className, title }: IconProps) {
  const id = useId().replace(/:/g, '');
  const slabGradient = `levitate-slab-${id}`;
  const slabGradientSecondary = `levitate-slab-secondary-${id}`;
  const shadowGradient = `levitate-shadow-${id}`;

  return (
    <span
      className={cx(
        'relative inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-[15px] border border-[#f6e6bc]/35 bg-[linear-gradient(145deg,#f7e8c4_0%,#d3a24c_48%,#8c5917_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_14px_28px_rgba(120,78,17,0.24)]',
        className
      )}
    >
      <span className="absolute inset-[1px] rounded-[14px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.46),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(35,19,3,0.26),transparent_56%)]" />
      <svg
        viewBox="0 0 56 56"
        className="relative z-10 h-[72%] w-[72%]"
        aria-hidden={title ? undefined : true}
        role={title ? 'img' : 'presentation'}
      >
        {title ? <title>{title}</title> : null}
        <defs>
          <linearGradient id={slabGradient} x1="14" y1="12" x2="41" y2="41" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3b2300" stopOpacity="0.98" />
            <stop offset="1" stopColor="#6a4410" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={slabGradientSecondary} x1="17" y1="16" x2="38" y2="35" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff3d6" stopOpacity="0.88" />
            <stop offset="1" stopColor="#f0c671" stopOpacity="0.48" />
          </linearGradient>
          <linearGradient id={shadowGradient} x1="16" y1="42" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff3d6" stopOpacity="0.2" />
            <stop offset="0.5" stopColor="#fff3d6" stopOpacity="0.72" />
            <stop offset="1" stopColor="#fff3d6" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <path d="M28 8.75 41.25 15.45 28 22.1 14.75 15.45Z" fill={`url(#${slabGradientSecondary})`} />
        <path d="M28 11.1 38.2 16.25 28 21.35 17.8 16.25Z" fill={`url(#${slabGradient})`} opacity="0.92" />
        <path d="M28 22.55 38.1 27.65 28 32.75 17.9 27.65Z" fill={`url(#${slabGradient})`} opacity="0.9" />
        <path d="M28 33.65 36.2 37.8 28 41.9 19.8 37.8Z" fill={`url(#${slabGradient})`} opacity="0.88" />
        <path
          d="M17.9 16.25V27.65M38.1 16.25V27.65M19.8 37.8l-1.9-10.15M36.2 37.8l1.9-10.15"
          stroke={`url(#${slabGradientSecondary})`}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.65"
          opacity="0.92"
        />
        <path
          d="M15.4 45.2c3.85-2.05 8.05-3.05 12.6-3.05s8.75 1 12.6 3.05"
          fill="none"
          stroke={`url(#${shadowGradient})`}
          strokeLinecap="round"
          strokeWidth="1.8"
        />
        <circle cx="28" cy="27.65" r="1.85" fill="#f7e8c4" opacity="0.96" />
      </svg>
    </span>
  );
}

export function LevitatePortalGlyph({ className, title }: IconProps) {
  const id = useId().replace(/:/g, '');
  const lineGradient = `levitate-portal-line-${id}`;
  const glowGradient = `levitate-portal-glow-${id}`;

  return (
    <span
      className={cx(
        'relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-[16px] border border-[#c8a96e]/25 bg-[linear-gradient(150deg,rgba(255,255,255,0.1),rgba(15,23,42,0.92))] shadow-[0_16px_30px_rgba(0,0,0,0.22)]',
        className
      )}
    >
      <span className="absolute inset-[1px] rounded-[15px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_32%),linear-gradient(160deg,rgba(15,23,42,0.92),rgba(30,41,59,0.96))]" />
      <svg
        viewBox="0 0 56 56"
        className="relative z-10 h-[74%] w-[74%]"
        aria-hidden={title ? undefined : true}
        role={title ? 'img' : 'presentation'}
      >
        {title ? <title>{title}</title> : null}
        <defs>
          <linearGradient id={lineGradient} x1="10" y1="12" x2="44" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f8e8bf" />
            <stop offset="1" stopColor="#c8a96e" />
          </linearGradient>
          <radialGradient id={glowGradient} cx="0" cy="0" r="1" gradientTransform="translate(28 28) rotate(90) scale(24)">
            <stop stopColor="#f6d18f" stopOpacity="0.45" />
            <stop offset="1" stopColor="#f6d18f" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="28" cy="28" r="17" fill={`url(#${glowGradient})`} />
        <path
          d="M17 17.5h22a2.5 2.5 0 0 1 2.5 2.5v16A2.5 2.5 0 0 1 39 38.5H17A2.5 2.5 0 0 1 14.5 36V20a2.5 2.5 0 0 1 2.5-2.5Z"
          fill="none"
          stroke={`url(#${lineGradient})`}
          strokeWidth="2"
          rx="2.5"
        />
        <path d="M20.5 23.5h7M20.5 28h15M20.5 32.5h10" stroke={`url(#${lineGradient})`} strokeWidth="2" strokeLinecap="round" />
        <path d="M34 24.5h3.5v8H34z" fill="none" stroke={`url(#${lineGradient})`} strokeWidth="2" rx="1" />
        <circle cx="35.75" cy="28.5" r="1.25" fill="#f8e8bf" />
      </svg>
    </span>
  );
}

export function LevitateControlGlyph({ className, title }: IconProps) {
  const id = useId().replace(/:/g, '');
  const accentGradient = `levitate-control-accent-${id}`;
  const ringGradient = `levitate-control-ring-${id}`;

  return (
    <span
      className={cx(
        'relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-[16px] border border-[#c8a96e]/25 bg-[linear-gradient(160deg,rgba(12,12,11,0.94),rgba(51,32,4,0.9))] shadow-[0_16px_30px_rgba(0,0,0,0.22)]',
        className
      )}
    >
      <span className="absolute inset-[1px] rounded-[15px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_34%),linear-gradient(180deg,rgba(31,20,3,0.96),rgba(12,12,11,0.98))]" />
      <svg
        viewBox="0 0 56 56"
        className="relative z-10 h-[74%] w-[74%]"
        aria-hidden={title ? undefined : true}
        role={title ? 'img' : 'presentation'}
      >
        {title ? <title>{title}</title> : null}
        <defs>
          <linearGradient id={accentGradient} x1="16" y1="14" x2="39" y2="39" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff0cb" />
            <stop offset="1" stopColor="#c89d58" />
          </linearGradient>
          <linearGradient id={ringGradient} x1="14" y1="28" x2="42" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#c89d58" stopOpacity="0.22" />
            <stop offset="0.5" stopColor="#fff0cb" stopOpacity="0.92" />
            <stop offset="1" stopColor="#c89d58" stopOpacity="0.22" />
          </linearGradient>
        </defs>

        <circle cx="28" cy="28" r="15" fill="none" stroke={`url(#${ringGradient})`} strokeWidth="1.6" />
        <path d="M28 12.5 39.5 19 28 25.5 16.5 19Z" fill="none" stroke={`url(#${accentGradient})`} strokeWidth="2" strokeLinejoin="round" />
        <path d="M19.5 25.2v8.8L28 39l8.5-5v-8.8" fill="none" stroke={`url(#${accentGradient})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M28 25.5V39" stroke={`url(#${accentGradient})`} strokeWidth="2" strokeLinecap="round" />
        <path d="M22.25 31.5 28 34.8l5.75-3.3" fill="none" stroke={`url(#${accentGradient})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function LevitateWordmark({
  className,
  suffix = 'Labs',
  prefixClassName,
  accentClassName,
}: {
  className?: string;
  suffix?: string;
  prefixClassName?: string;
  accentClassName?: string;
}) {
  return (
    <span className={cx('inline-flex items-baseline font-body font-semibold tracking-[-0.075em]', className)}>
      <span className={cx('text-current', prefixClassName)}>Levitate</span>
      <span className={cx('ml-[0.04em] text-[#C8A96E]', accentClassName)}>{suffix}</span>
    </span>
  );
}

export function LevitateLockup({
  className,
  markClassName,
  wordmarkClassName,
  prefixClassName,
  accentClassName,
  suffix = 'Labs',
  subtitle,
  subtitleClassName,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  prefixClassName?: string;
  accentClassName?: string;
  suffix?: string;
  subtitle?: string;
  subtitleClassName?: string;
}) {
  return (
    <div className={cx('inline-flex items-center gap-3', className)}>
      <LevitateMark className={markClassName} />
      <div className="min-w-0">
        <LevitateWordmark
          className={wordmarkClassName}
          suffix={suffix}
          prefixClassName={prefixClassName}
          accentClassName={accentClassName}
        />
        {subtitle ? (
          <div className={cx('mt-1 text-[10px] uppercase tracking-[0.24em] text-white/45', subtitleClassName)}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

