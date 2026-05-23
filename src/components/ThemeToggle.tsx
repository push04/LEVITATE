'use client';

import { Sun } from 'lucide-react';

export default function ThemeToggle() {
  return (
    <div className="relative p-2 rounded-xl bg-[var(--secondary)]" aria-label="Light mode active">
      <Sun className="w-5 h-5 text-[var(--primary)]" />
    </div>
  );
}
