'use client';

import { useRouter } from 'next/navigation';
import { CalendarClock } from 'lucide-react';
import { formatIndianDate } from '@/lib/date-format';

// The public digest page is a server component (see src/app/market-pulse/page.tsx)
// so date navigation happens via URL search params, not client state - picking a
// date here just pushes ?date=YYYY-MM-DD and lets the server re-render for it.
export default function DigestDateSelector({ dates, selected }: { dates: string[]; selected: string }) {
  const router = useRouter();
  if (dates.length <= 1) return null;

  return (
    <label className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1.5 type-caption text-[var(--text-secondary)]">
      <CalendarClock className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
      <select
        value={selected}
        onChange={(e) => router.push(`/market-pulse?date=${e.target.value}`)}
        className="bg-transparent type-caption text-[var(--text-secondary)] focus:outline-none"
      >
        {dates.map((d) => (
          <option key={d} value={d}>
            {formatIndianDate(d)}
          </option>
        ))}
      </select>
    </label>
  );
}
