'use client';

import { useState, useEffect, type ReactNode } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Menu, X, Shield } from 'lucide-react';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

export default function DashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();

    // Force light mode in admin
    useEffect(() => {
        const html = document.documentElement;
        html.classList.remove('dark');
        return () => {}; // keep light mode
    }, []);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    return (
        <div className="admin-light flex min-h-screen bg-[var(--background)]">

            {/* Desktop Sidebar */}
            <aside className="hidden md:block shrink-0 h-screen sticky top-0 overflow-y-auto w-64 border-r border-[var(--border)] bg-[var(--surface)]">
                <AdminSidebar />
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsSidebarOpen(false)}
                    />

                    {/* Sidebar Content */}
                    <div className="relative w-64 h-full bg-[var(--surface)] shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--secondary)] text-[var(--muted)]"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <AdminSidebar />
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-40">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[var(--primary)] text-white">
                            <Shield className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg">LevitateOS</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 rounded-lg hover:bg-[var(--secondary)] text-[var(--foreground)]"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-x-hidden p-4 md:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
