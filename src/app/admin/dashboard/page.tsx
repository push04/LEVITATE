'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Zap, LogOut, Users, TrendingUp, DollarSign, Clock,
    RefreshCw, Sparkles, Mail, Phone, FileText, ExternalLink,
    CheckCircle, Clock3, XCircle, Loader2, ChevronDown
} from 'lucide-react';
import type { Lead } from '@/lib/supabase';

const statusConfig = {
    New: { color: 'bg-blue-500', icon: Clock3, label: 'New' },
    Contacted: { color: 'bg-yellow-500', icon: Phone, label: 'Contacted' },
    Closed: { color: 'bg-green-500', icon: CheckCircle, label: 'Closed' },
};

export default function AdminDashboard() {
    const router = useRouter();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'New' | 'Contacted' | 'Closed'>('all');

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setIsLoading(true);
        try {
            // Fetch from Supabase (Persistent)
            const dbResponse = await fetch('/api/admin/leads');
            const dbData = await dbResponse.json();

            // Fetch from Local Memory (Fallback)
            const localResponse = await fetch('/api/contact');
            const localData = await localResponse.json();

            // Merge unique leads
            const allLeads = [
                ...(dbData.success ? dbData.data : []),
                ...(localData.success ? localData.localLeads : [])
            ];

            // Deduplicate by ID
            const uniqueLeads = Array.from(new Map(allLeads.map(item => [item.id, item])).values());

            // Sort by date new to old
            uniqueLeads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setLeads(uniqueLeads);
        } catch (error) {
            console.error('Failed to fetch leads:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateLeadStatus = async (id: string, status: 'New' | 'Contacted' | 'Closed') => {
        try {
            const response = await fetch('/api/admin/leads', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status }),
            });
            const data = await response.json();
            if (data.success) {
                setLeads(prev => prev.map(lead =>
                    lead.id === id ? { ...lead, status } : lead
                ));
            }
        } catch (error) {
            console.error('Failed to update lead:', error);
        }
    };

    const analyzeLeadWithAI = async (lead: Lead) => {
        setSelectedLead(lead);
        setIsAnalyzing(true);
        setAiAnalysis(null);

        try {
            const response = await fetch('/api/admin/ai-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId: lead.id }),
            });
            const data = await response.json();
            if (data.success) {
                setAiAnalysis(data.analysis);
            } else {
                setAiAnalysis('Unable to generate analysis. Please try again.');
            }
        } catch (error) {
            setAiAnalysis('Error connecting to AI service.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/admin/login', { method: 'DELETE' });
        router.push('/admin');
    };

    const filteredLeads = filter === 'all'
        ? leads
        : leads.filter(lead => lead.status === filter);

    const stats = {
        total: leads.length,
        new: leads.filter(l => l.status === 'New').length,
        contacted: leads.filter(l => l.status === 'Contacted').length,
        closed: leads.filter(l => l.status === 'Closed').length,
    };

    return (
        <div className="min-h-screen bg-[var(--background)]">
            {/* Header */}
            <header className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <div className="p-2 rounded-lg bg-[var(--primary)]">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold">Levitate Labs</h1>
                                <p className="text-xs text-[var(--muted)]">Admin Dashboard</p>
                            </div>
                        </a>
                        <div className="flex items-center gap-4">
                            <a
                                href="/"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--secondary)] 
                                         hover:bg-[var(--border)] transition-colors text-sm font-medium"
                            >
                                <ExternalLink className="w-4 h-4" />
                                View Website
                            </a>
                            <motion.button
                                onClick={fetchLeads}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-2 rounded-lg bg-[var(--secondary)] hover:bg-[var(--border)] transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                            </motion.button>
                            <motion.button
                                onClick={handleLogout}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 
                         hover:bg-red-500/20 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </motion.button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        title="Total Leads"
                        value={stats.total}
                        icon={Users}
                        color="text-[var(--primary)]"
                    />
                    <StatCard
                        title="New"
                        value={stats.new}
                        icon={Clock}
                        color="text-blue-400"
                    />
                    <StatCard
                        title="Contacted"
                        value={stats.contacted}
                        icon={TrendingUp}
                        color="text-yellow-400"
                    />
                    <StatCard
                        title="Closed"
                        value={stats.closed}
                        icon={DollarSign}
                        color="text-green-400"
                    />
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Leads List */}
                    <div className="lg:col-span-2">
                        <div className="glass-card overflow-hidden">
                            <div className="p-4 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
                                <h2 className="font-bold">Inquiry Feed</h2>
                                <div className="flex gap-2">
                                    {(['all', 'New', 'Contacted', 'Closed'] as const).map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setFilter(status)}
                                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${filter === status
                                                ? 'bg-[var(--primary)] text-white'
                                                : 'bg-[var(--secondary)] hover:bg-[var(--border)]'
                                                }`}
                                        >
                                            {status === 'all' ? 'All' : status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto">
                                {isLoading ? (
                                    <div className="p-8 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        <p className="text-[var(--muted)]">Loading leads...</p>
                                    </div>
                                ) : filteredLeads.length === 0 ? (
                                    <div className="p-8 text-center text-[var(--muted)]">
                                        No leads found
                                    </div>
                                ) : (
                                    filteredLeads.map((lead) => (
                                        <LeadCard
                                            key={lead.id}
                                            lead={lead}
                                            onStatusChange={updateLeadStatus}
                                            onAnalyze={() => analyzeLeadWithAI(lead)}
                                            isSelected={selectedLead?.id === lead.id}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* AI Analysis Panel */}
                    <div className="lg:col-span-1">
                        <div className="glass-card p-6 sticky top-24">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-5 h-5 text-[var(--primary)]" />
                                <h2 className="font-bold">AI Analysis</h2>
                            </div>

                            {selectedLead ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-[var(--secondary)]">
                                        <p className="font-medium mb-1">{selectedLead.name}</p>
                                        <p className="text-sm text-[var(--muted)]">{selectedLead.email}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-0.5 rounded text-xs bg-[var(--primary)]/10 text-[var(--primary)]">
                                                {selectedLead.service_category}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400">
                                                {selectedLead.budget}
                                            </span>
                                        </div>
                                    </div>

                                    {isAnalyzing ? (
                                        <div className="p-8 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[var(--primary)]" />
                                            <p className="text-sm text-[var(--muted)]">Analyzing with AI...</p>
                                        </div>
                                    ) : aiAnalysis ? (
                                        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                                            <pre className="whitespace-pre-wrap text-sm text-[var(--muted)] font-sans">
                                                {aiAnalysis}
                                            </pre>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[var(--muted)] text-center py-4">
                                            Click &quot;Analyze&quot; on a lead to get AI insights
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-[var(--muted)] opacity-50" />
                                    <p className="text-[var(--muted)]">
                                        Select a lead and click Analyze to get AI-powered insights
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon: Icon,
    color
}: {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4"
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--muted)]">{title}</span>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
        </motion.div>
    );
}

function LeadCard({
    lead,
    onStatusChange,
    onAnalyze,
    isSelected,
}: {
    lead: Lead;
    onStatusChange: (id: string, status: 'New' | 'Contacted' | 'Closed') => void;
    onAnalyze: () => void;
    isSelected: boolean;
}) {
    const [showDropdown, setShowDropdown] = useState(false);
    const status = statusConfig[lead.status];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-4 hover:bg-[var(--secondary)]/50 transition-colors ${isSelected ? 'bg-[var(--primary)]/5 border-l-2 border-[var(--primary)]' : ''
                }`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{lead.name}</h3>
                        <span className={`w-2 h-2 rounded-full ${status.color}`} />
                    </div>
                    <p className="text-sm text-[var(--muted)] truncate">{lead.email}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded text-xs bg-[var(--secondary)] capitalize">
                            {lead.service_category}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs bg-[var(--secondary)]">
                            {lead.budget}
                        </span>
                        {lead.file_url && (
                            <a
                                href={lead.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs 
                         bg-[var(--primary)]/10 text-[var(--primary)] hover:underline"
                            >
                                <FileText className="w-3 h-3" />
                                File
                            </a>
                        )}
                    </div>
                    {lead.message && (
                        <p className="text-sm text-[var(--muted)] mt-2 line-clamp-2">
                            {lead.message}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    {/* Status Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium 
                       text-white ${status.color}`}
                        >
                            <status.icon className="w-3 h-3" />
                            {status.label}
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        <AnimatePresence>
                            {showDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute right-0 mt-1 w-32 bg-[var(--surface)] border 
                           border-[var(--border)] rounded-lg shadow-lg overflow-hidden z-10"
                                >
                                    {(['New', 'Contacted', 'Closed'] as const).map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => {
                                                onStatusChange(lead.id, s);
                                                setShowDropdown(false);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--secondary)] 
                               flex items-center gap-2"
                                        >
                                            <span className={`w-2 h-2 rounded-full ${statusConfig[s].color}`} />
                                            {s}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Analyze Button */}
                    <motion.button
                        onClick={onAnalyze}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                     bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20"
                    >
                        <Sparkles className="w-3 h-3" />
                        Analyze
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}
