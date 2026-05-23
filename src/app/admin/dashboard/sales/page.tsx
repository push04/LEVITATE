'use client';

import { motion } from 'framer-motion';
import {
    TrendingUp, Users, Mail, Target,
    ArrowRight, Globe, BarChart3, Search
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

export default function SalesDashboard() {
    const [stats, setStats] = useState([
        { label: 'Total Leads', value: '0', change: '0%', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Campaigns Sent', value: '0', change: '0%', icon: Mail, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        { label: 'Conversion Rate', value: '0%', change: '0%', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: 'Active Deals', value: '0', change: '0%', icon: Target, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    ]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            // 1. Total Leads
            const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });

            // 2. Campaigns Sent
            const { count: campaignsCount } = await supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'sent');

            // 3. Active Deals (Leads with status not 'New' or 'Closed' approx, or specific status)
            const { count: activeDealsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).neq('status', 'Closed').neq('status', 'New');

            // 4. Conversion (Closed / Total)
            const { count: closedCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Closed');

            const total = leadsCount || 0;
            const closed = closedCount || 0;
            const conversion = total > 0 ? ((closed / total) * 100).toFixed(1) : '0.0';

            setStats([
                { label: 'Total Leads', value: total.toLocaleString(), change: '+Active', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Campaigns Sent', value: (campaignsCount || 0).toLocaleString(), change: '+Recent', icon: Mail, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { label: 'Conversion Rate', value: `${conversion}%`, change: '---', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
                { label: 'Active Deals', value: (activeDealsCount || 0).toLocaleString(), change: 'In Pipeline', icon: Target, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            ]);

            // FETCH RECENT ACTIVITY
            // 1. New Leads
            const { data: newLeads } = await supabase
                .from('leads')
                .select('id, name, created_at, company')
                .order('created_at', { ascending: false })
                .limit(5);

            // 2. Sent Campaigns
            const { data: sentCampaigns } = await supabase
                .from('campaigns')
                .select('id, title, created_at, status')
                .order('created_at', { ascending: false })
                .limit(5);

            // Merge and Sort
            const activityList = [
                ...(newLeads?.map((l: any) => ({
                    type: 'lead',
                    title: `New Lead: ${l.name}`,
                    subtitle: l.company || 'No Company',
                    date: new Date(l.created_at),
                    icon: Users,
                    color: 'text-blue-500',
                    bg: 'bg-blue-500/10',
                    status: 'New'
                })) || []),
                ...(sentCampaigns?.map((c: any) => ({
                    type: 'campaign',
                    title: `Campaign: ${c.title}`,
                    subtitle: `Status: ${c.status}`,
                    date: new Date(c.created_at),
                    icon: Mail,
                    color: 'text-purple-500',
                    bg: 'bg-purple-500/10',
                    status: c.status
                })) || [])
            ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

            setRecentActivity(activityList);
        };
        fetchStats();
    }, []);

    const modules = [
        {
            title: 'Lead Hunter',
            description: 'AI-Powered Web Scraper found new business opportunities.',
            icon: Globe,
            href: '/admin/dashboard/sales/leads/generate',
            color: 'from-blue-600 to-indigo-600',
            buttonText: 'Find Leads'
        },
        {
            title: 'Email Broadcaster',
            description: 'Launch targeted email campaigns to your lead lists.',
            icon: Mail,
            href: '/admin/dashboard/sales/campaigns',
            color: 'from-purple-600 to-pink-600',
            buttonText: 'Create Campaign'
        },
        {
            title: 'CRM Pipeline',
            description: 'Manage your deals and track progress.',
            icon: BarChart3,
            href: '/admin/dashboard/leads', // Reuse existing CRM
            color: 'from-emerald-500 to-teal-500',
            buttonText: 'View Pipeline'
        }
    ];

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2">Growth & Sales Command Center</h1>
                <p className="text-[var(--muted)]">Manage your outreach, generate leads, and track performance.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card p-6 rounded-2xl border border-[var(--border)]"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {stat.change}
                            </span>
                        </div>
                        <div>
                            <p className="text-[var(--muted)] text-sm mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-bold">{stat.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modules Grid */}
            <h2 className="text-xl font-bold pt-4">Tools & Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {modules.map((module, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ y: -5 }}
                        className="group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-lg"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                        <div className="p-8 flex flex-col h-full relative z-10">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center text-white mb-6 shadow-lg`}>
                                <module.icon className="w-7 h-7" />
                            </div>

                            <h3 className="text-xl font-bold mb-2">{module.title}</h3>
                            <p className="text-[var(--muted)] mb-8 flex-1">{module.description}</p>

                            <Link href={module.href} className="w-full">
                                <button className="w-full py-3 rounded-xl bg-[var(--foreground)] text-[var(--background)] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                                    {module.buttonText}
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </Link>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="glass-card rounded-2xl border border-[var(--border)] p-6">
                <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
                <div className="space-y-4">
                    {recentActivity.length > 0 ? (
                        recentActivity.map((activity, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 hover:bg-[var(--secondary)] rounded-xl transition-colors cursor-pointer">
                                <div className={`w-10 h-10 rounded-full ${activity.bg} flex items-center justify-center ${activity.color}`}>
                                    <activity.icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{activity.title}</p>
                                    <p className="text-xs text-[var(--muted)]">
                                        {activity.date.toLocaleDateString()} • {activity.subtitle}
                                    </p>
                                </div>
                                <div className="text-xs font-bold text-[var(--primary)] capitalize">{activity.status}</div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-[var(--muted)]">
                            No recent activity found. Start hunting leads!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
