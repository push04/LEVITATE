'use client';

import { motion } from 'framer-motion';
import AnimatedNumber from './AnimatedNumber';
import styles from './DashboardPrimitives.module.css';
import { cn } from './utils';

const TONE_MAP = {
  gold: { accent: 'var(--gold-muted)', fill: 'rgba(201, 165, 90, 0.7)' },
  new: { accent: 'var(--status-new)', fill: 'rgba(107, 127, 163, 0.65)' },
  progress: { accent: 'var(--status-progress)', fill: 'rgba(184, 124, 58, 0.68)' },
  closed: { accent: 'var(--status-closed)', fill: 'rgba(61, 122, 92, 0.7)' },
} as const;

type Tone = keyof typeof TONE_MAP;

export default function StatCard({
  label,
  value,
  tone,
  formatter,
  trend = [],
  detail,
  className,
}: {
  label: string;
  value: number;
  tone: Tone;
  formatter?: (value: number) => string;
  trend?: number[];
  detail?: string;
  className?: string;
}) {
  const accent = TONE_MAP[tone];
  const bars = trend.length > 0 ? trend : [32, 48, 42, 58, 52, 74, 61, 84];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(styles.panel, styles.panelHover, 'p-5 md:p-6', className)}
      style={{ borderLeft: `3px solid ${accent.accent}` }}
    >
      <div className="type-subheading text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-3 type-stat text-[var(--text-primary)]">
        <AnimatedNumber value={value} formatter={formatter} />
      </div>
      {detail ? <p className="mt-2 type-caption">{detail}</p> : null}
      <div className={cn(styles.sparkline, 'mt-5')}>
        {bars.map((bar, index) => (
          <div
            key={`${label}-${index}`}
            className={styles.sparklineBar}
            style={{
              height: `${Math.max((bar / 100) * 26, 8)}px`,
              backgroundColor: accent.fill,
              animationDelay: `${index * 80}ms`,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
