import Link from 'next/link';
import DemoDashboardClient from './DemoDashboardClient';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="sticky top-0 z-50 bg-[#C8A96E] text-[var(--foreground)] px-4 py-2 flex items-center justify-between text-sm">
        <span>You&apos;re viewing a live demo with sample data — </span>
        <Link href="/onboard" className="underline font-semibold">Activate your workspace →</Link>
      </div>
      <DemoDashboardClient />
    </div>
  );
}

