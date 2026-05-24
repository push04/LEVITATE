'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import BusinessSidebar from '@/components/business/BusinessSidebar';
import BusinessResearchRunProvider from '@/components/business/BusinessResearchRunProvider';
import TrialCountdownBanner from '@/components/business/TrialCountdownBanner';

export default function BusinessDashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <BusinessResearchRunProvider />

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 md:block overflow-y-auto">
        <BusinessSidebar />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 h-full w-[220px] max-w-[85vw] overflow-y-auto shadow-xl">
            <BusinessSidebar onNavigate={() => setSidebarOpen(false)} />
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <TrialCountdownBanner />

        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm md:hidden">
          <div>
            <div className="text-[15px] font-bold text-gray-900">
              Levitate<span className="ml-1 font-light text-gray-400">OS</span>
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Business Portal</div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="relative flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-5 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
