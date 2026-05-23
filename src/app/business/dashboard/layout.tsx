'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import BusinessSidebar from '@/components/business/BusinessSidebar';
import BusinessResearchRunProvider from '@/components/business/BusinessResearchRunProvider';
import TrialCountdownBanner from '@/components/business/TrialCountdownBanner';

export default function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="animate-levitate-page-enter flex min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <BusinessResearchRunProvider />
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 md:block">
        <BusinessSidebar />
      </aside>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="relative z-10 h-full w-[220px] max-w-[85vw]">
            <BusinessSidebar onNavigate={() => setIsSidebarOpen(false)} />
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <TrialCountdownBanner />
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[rgba(15,14,11,0.86)] px-4 py-4 backdrop-blur-md md:hidden">
          <div>
            <div className="font-serif-display text-lg text-[var(--gold-base)]">Levitate<span className="ml-1 font-ui font-light text-[var(--text-secondary)]">OS</span></div>
            <div className="type-caption uppercase tracking-[1.3px]">Business Portal</div>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="relative flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-5 md:px-8 md:py-8 lg:px-9">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
