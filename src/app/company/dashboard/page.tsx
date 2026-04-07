'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, CheckCircle, Clock, Plus, Zap } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function CompanyDashboard() {
    const [stats, setStats] = useState({
        activeProjects: 0,
        completedProjects: 0,
        pendingReview: 0
    });
    const [recentProjects, setRecentProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // fetch company
                const { data: company } = await supabase
                    .from('companies')
                    .select('id')
                    .eq('owner_id', user.id)
                    .single();

                if (company) {
                    // Fetch projects
                    const { data: projects } = await supabase
                        .from('projects')
                        .select('*')
                        .eq('company_id', company.id)
                        .order('created_at', { ascending: false });

                    if (projects) {
                        setStats({
                            activeProjects: projects.filter(p => p.status === 'active').length,
                            completedProjects: projects.filter(p => p.status === 'completed').length,
                            pendingReview: projects.filter(p => p.status === 'pending').length
                        });
                        setRecentProjects(projects.slice(0, 5));
                    }
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const statCards = [
        { label: 'Active Projects', value: stats.activeProjects, icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Completed', value: stats.completedProjects, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: 'Pending Review', value: stats.pendingReview, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-heading">Dashboard Overview</h1>
                    <p className="text-[var(--muted)]">Welcome back, here's what's happening with your projects.</p>
                </div>
                <Link
                    href="/company/dashboard/projects"
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    New Project
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)]"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className="text-3xl font-bold">{stat.value}</span>
                        </div>
                        <p className="text-[var(--muted)] font-medium">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Recent Projects */}
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
                <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                    <h2 className="text-xl font-bold">Recent Projects</h2>
                    <Link href="/company/dashboard/projects" className="text-indigo-500 hover:text-indigo-600 font-medium text-sm">
                        View All
                    </Link>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-[var(--muted)]">Loading projects...</div>
                ) : recentProjects.length > 0 ? (
                    <div className="divide-y divide-[var(--border)]">
                        {recentProjects.map((project) => (
                            <div key={project.id} className="p-6 hover:bg-[var(--secondary)]/50 transition-colors flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-lg bg-[var(--secondary)] group-hover:bg-indigo-500/10 transition-colors">
                                        <Briefcase className="w-6 h-6 text-[var(--muted)] group-hover:text-indigo-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg mb-1">{project.title}</h3>
                                        <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                                            <span>{new Date(project.created_at).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span className={`capitalize ${project.status === 'active' ? 'text-blue-500' :
                                                    project.status === 'completed' ? 'text-green-500' :
                                                        'text-orange-500'
                                                }`}>{project.status}</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)] text-sm font-medium transition-colors">
                                    View Details
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--secondary)] flex items-center justify-center mb-4">
                            <Briefcase className="w-8 h-8 text-[var(--muted)]" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">No projects yet</h3>
                        <p className="text-[var(--muted)] mb-6 max-w-sm mx-auto">
                            Get started by creating your first project request. We'll assign a team member to it shortly.
                        </p>
                        <Link
                            href="/company/dashboard/projects"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            Create Project
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
