'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Mail, Phone, Calendar,
    MoreVertical, CheckCircle2, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Types
interface Lead {
    id: string;
    name: string;
    email: string;
    phone: string;
    service_category: string; // e.g., 'Web Dev', 'Marketing'
    message: string;
    budget: string;
    status: 'New' | 'Contacted' | 'Follow Up' | 'Closed';
    created_at: string;
    source?: string;
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');



    const fetchLeads = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setLeads(data as Lead[]);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const updateStatus = async (id: string, newStatus: string) => {
        // Optimistic update
        setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus as Lead['status'] } : l));

        await supabase
            .from('leads')
            .update({ status: newStatus })
            .eq('id', id);
    };

    const filteredLeads = leads.filter(lead => {
        const matchesSearch =
            lead.name.toLowerCase().includes(search.toLowerCase()) ||
            lead.email?.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'New': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'Contacted': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'Follow Up': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'Closed': return 'bg-green-500/10 text-green-500 border-green-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">CRM & Leads</h1>
                    <p className="text-[var(--muted)]">Manage incoming inquiries and potential clients</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                    <input
                        type="text"
                        placeholder="Search leads..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                </div>

                {/* Status Filter */}
                <div className="flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] shrink-0 overflow-x-auto">
                    {['All', 'New', 'Contacted', 'Follow Up', 'Closed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${statusFilter === status
                                ? 'bg-[var(--secondary)] text-[var(--foreground)] shadow-sm'
                                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leads List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="p-8 text-center text-[var(--muted)]">Loading leads...</div>
                ) : filteredLeads.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-[var(--border)] rounded-2xl">
                        <p className="text-[var(--muted)]">No leads found matching your criteria.</p>
                    </div>
                ) : (
                    filteredLeads.map((lead, index) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            key={lead.id}
                            className="glass-card p-6 flex flex-col lg:flex-row gap-6 hover:border-[var(--primary)]/30 transition-colors"
                        >
                            {/* Main Info */}
                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h3 className="text-lg font-bold">{lead.name}</h3>
                                        <p className="text-sm text-[var(--muted)]">{lead.service_category || 'General Inquiry'}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(lead.status)}`}>
                                        {lead.status}
                                    </span>
                                </div>

                                <p className="text-sm text-[var(--foreground)]/80 line-clamp-2 mb-4 bg-[var(--secondary)]/30 p-3 rounded-lg">
                                    &ldquo;{lead.message}&rdquo;
                                </p>

                                <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                                    {lead.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4" />
                                            <a href={`mailto:${lead.email}`} className="hover:text-[var(--primary)] transition-colors">{lead.email}</a>
                                        </div>
                                    )}
                                    {lead.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4" />
                                            <a href={`tel:${lead.phone}`} className="hover:text-[var(--primary)] transition-colors">{lead.phone}</a>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {lead.budget && (
                                        <div className="flex items-center gap-2 px-2 py-0.5 bg-[var(--secondary)] rounded text-xs font-medium">
                                            <span>Budget: {lead.budget}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex lg:flex-col items-center justify-center gap-2 pt-4 lg:pt-0 lg:pl-6 lg:border-l border-[var(--border)] shrink-0">
                                <p className="text-xs font-medium text-[var(--muted)] mb-2 uppercase hidden lg:block">Move To</p>
                                <div className="flex lg:flex-col gap-2 w-full">
                                    {lead.status !== 'Contacted' && (
                                        <button
                                            onClick={() => updateStatus(lead.id, 'Contacted')}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 transition-colors w-full justify-center"
                                        >
                                            <Clock className="w-3 h-3" /> Contacted
                                        </button>
                                    )}
                                    {lead.status !== 'Closed' && (
                                        <button
                                            onClick={() => updateStatus(lead.id, 'Closed')}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors w-full justify-center"
                                        >
                                            <CheckCircle2 className="w-3 h-3" /> Close Deal
                                        </button>
                                    )}
                                    {lead.status !== 'Follow Up' && lead.status !== 'Closed' && (
                                        <button
                                            onClick={() => updateStatus(lead.id, 'Follow Up')}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 transition-colors w-full justify-center"
                                        >
                                            <MoreVertical className="w-3 h-3" /> Follow Up
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
