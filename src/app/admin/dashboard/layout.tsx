'use client';

import { useState, useEffect, type ReactNode } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Menu, X, Shield } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:block shrink-0 h-screen sticky top-0 overflow-y-auto">
        <AdminSidebar />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 h-full overflow-y-auto shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
            <AdminSidebar />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#B08D57] text-white">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[15px] font-bold text-gray-900">LevitateOS</span>
              <span className="ml-1.5 text-[11px] text-gray-400">Admin</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
