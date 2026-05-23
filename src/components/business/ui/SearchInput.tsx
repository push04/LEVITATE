'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from './utils';

export default function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  debounceMs = 220,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  debounceMs?: number;
}) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    if (draftValue === value) {
      return;
    }

    const timeout = window.setTimeout(() => {
      onChange(draftValue);
    }, debounceMs);

    return () => window.clearTimeout(timeout);
  }, [debounceMs, draftValue, onChange, value]);

  return (
    <label className={cn('relative block', className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
      <input
        type="text"
        value={draftValue}
        onChange={(event) => setDraftValue(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] py-3 pl-11 pr-12 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--gold-glow)]"
      />
      {draftValue ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setDraftValue('');
            onChange('');
          }}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </label>
  );
}
