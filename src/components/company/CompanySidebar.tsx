'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, Briefcase, FileText, Settings, LogOut, Building2
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CompanySidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [companyName, setCompanyName] = useState('Company Portal');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCompanyDetails = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: company } = await supabase
                    .from('companies')
                    .select('name')
                    .eq('owner_id', user.id)
                    .single();

                if (company) {
                    setCompanyName(company.name);
                }
            }
            setLoading(false);
        };
        fetchCompanyDetails();
    }, []);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Signout error:', error);
        } finally {
            window.location.href = '/company/login'; // Force full refresh
        }
    };

    const menuItems = [
        {
            label: 'Overview',
            icon: LayoutDashboard,
            href: '/company/dashboard',
        },
        {
            label: 'Projects',
            icon: Briefcase,
            href: '/company/dashboard/projects',
        },
        {
            label: 'Files',
            icon: FileText,
            href: '/company/dashboard/files',
        },
        {
            label: 'Settings',
            icon: Settings,
            href: '/company/dashboard/settings',
        },
    ];

    if (loading) return <div className="w-64 h-screen bg-[var(--surface)] border-r border-[var(--border)]" />;

    return (
        <div className="w-64 h-screen bg-[var(--surface)] border-r border-[var(--border)] flex flex-col sticky top-0">
            {/* Brand */}
            <div className="p-6 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500 text-white">
                    <Building2 className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="font-bold text-lg truncate max-w-[140px]">{companyName}</h1>
                    <p className="text-xs text-[var(--muted)]">Partner Portal</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-[var(--muted)] hover:bg-[var(--secondary)] hover:text-indigo-500'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-[var(--border)]">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
