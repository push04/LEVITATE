'use client';

import { useProfile } from '@/hooks/useProfile';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, Users, MessageSquare, Briefcase,
    FileText, Settings, LogOut, PieChart, Shield, Mail, Rocket,
    Bot, IndianRupee, Activity, Zap
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminSidebar() {
    const { profile, isLoading } = useProfile();
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Signout error:', error);
        } finally {
            window.location.href = '/login'; // Force full refresh
        }
    };

    const menuItems = [
        {
            label: 'Overview',
            icon: LayoutDashboard,
            href: '/admin/dashboard',
            roles: ['super_admin', 'admin', 'manager', 'employee', 'client', 'sales']
        },
        {
            label: 'Team',
            icon: Users,
            href: '/admin/dashboard/team',
            roles: ['super_admin', 'admin', 'manager']
        },
        {
            label: 'Projects',
            icon: Briefcase,
            href: '/admin/dashboard/projects',
            roles: ['super_admin', 'admin', 'manager', 'employee']
        },
        {
            label: 'Mailbox',
            icon: Mail,
            href: '/admin/dashboard/mailbox',
            roles: ['super_admin', 'admin']
        },
        {
            label: 'CRM',
            icon: PieChart,
            href: '/admin/dashboard/leads', // We might move the current dashboard here
            roles: ['super_admin', 'admin', 'sales']
        },
        {
            label: 'Chat',
            icon: MessageSquare,
            href: '/admin/dashboard/chat',
            roles: ['super_admin', 'admin', 'manager', 'employee']
        },
        {
            label: 'Files',
            icon: FileText,
            href: '/admin/dashboard/files',
            roles: ['super_admin', 'admin', 'manager', 'employee']
        },
        {
            label: 'Careers',
            icon: Users, // Using Users icon for now, or maybe Briefcase
            href: '/admin/dashboard/careers',
            roles: ['super_admin', 'admin']
        },

        {
            label: 'Marketing Suite',
            icon: Rocket,
            href: '/admin/dashboard/growth',
            roles: ['super_admin', 'admin', 'manager', 'sales', 'marketing'],
            subItems: [
                { label: 'Freelance Scout', href: '/admin/dashboard/growth/scout' },
                { label: 'Hackathon Scout', href: '/admin/dashboard/growth/hackathons' },
                { label: 'Social Monitor', href: '/admin/dashboard/growth/social' },
                { label: 'Campaigns', href: '/admin/dashboard/growth/campaigns' },
                { label: 'All Leads', href: '/admin/dashboard/growth/leads' }
            ]
        },
        {
            label: 'Sales Pipeline',
            icon: PieChart,
            href: '/admin/dashboard/sales',
            roles: ['super_admin', 'admin', 'manager', 'sales'],
            specialAccess: 'sales-marketing'
        },
        // ── AUTOMATION HQ ─────────────────────────────────────
        {
            label: '🤖 Automations',
            icon: Bot,
            href: '/admin/dashboard/automations',
            roles: ['super_admin', 'admin'],
            badge: 'AI'
        },
        {
            label: '💰 Revenue',
            icon: IndianRupee,
            href: '/admin/dashboard/revenue',
            roles: ['super_admin', 'admin']
        },
        {
            label: '📡 Live Logs',
            icon: Activity,
            href: '/admin/dashboard/logs',
            roles: ['super_admin', 'admin']
        }
    ];

    if (isLoading) return <div className="w-64 h-screen bg-[var(--surface)] border-r border-[var(--border)]" />;

    const filteredMenu = menuItems.filter(item => {
        if (!profile?.role) return false;

        // Role check
        const hasRole = item.roles.includes(profile.role);

        // Department check (if item has specialAccess defined)
        // @ts-ignore - Supabase type might not explicitly know about the joined department yet
        const hasDepartment = item.specialAccess && profile.departments?.slug === item.specialAccess;

        return hasRole || hasDepartment;
    });

    return (
        <div className="w-64 h-screen bg-[var(--surface)] border-r border-[var(--border)] flex flex-col sticky top-0">
            {/* Brand */}
            <div className="p-5 flex items-center gap-3 border-b border-[var(--border)]">
                <div className="p-2 rounded-lg bg-[var(--primary)]">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-base leading-tight">Levitate<span className="text-[var(--primary)]">OS</span></h1>
                    <p className="text-xs text-[var(--muted)]">AI Agency · {profile?.role?.replace('_', ' ')}</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {filteredMenu.map((item) => {
                    const isActive = pathname === item.href || (item.subItems && pathname.startsWith(item.href));
                    const isSubItemActive = (subHref: string) => pathname === subHref;

                    return (
                        <div key={item.href}>
                            <Link
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${isActive
                                    ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                                    : 'text-[var(--muted)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
                                    }`}
                            >
                                <item.icon className="w-4 h-4 flex-shrink-0" />
                                <span className="font-medium text-sm flex-1">{item.label}</span>
                                {/* @ts-ignore */}
                                {item.badge && (
                                    <span className="text-xs bg-[var(--primary)]/20 text-[var(--primary)] px-1.5 py-0.5 rounded font-bold">
                                        {/* @ts-ignore */}
                                        {item.badge}
                                    </span>
                                )}
                            </Link>

                            {/* Sub Items */}
                            {/* @ts-ignore */}
                            {item.subItems && isActive && (
                                <div className="ml-12 mt-1 space-y-1 border-l-2 border-[var(--border)] pl-2">
                                    {/* @ts-ignore */}
                                    {item.subItems.map((sub: any) => (
                                        <Link
                                            key={sub.href}
                                            href={sub.href}
                                            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${isSubItemActive(sub.href)
                                                ? 'bg-[var(--secondary)] text-[var(--foreground)] font-medium'
                                                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                                                }`}
                                        >
                                            {sub.label}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* User & Logout */}
            <div className="p-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        {profile?.full_name?.[0] || 'U'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
                        <p className="text-xs text-[var(--muted)] truncate">{profile?.email}</p>
                    </div>
                </div>
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
