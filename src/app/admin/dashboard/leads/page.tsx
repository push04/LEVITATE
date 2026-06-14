'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Mail, Phone, Calendar,
    MoreVertical, CheckCircle2, Clock, Upload,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ImportModal from '@/components/import/ImportModal';

// Types — match the actual `leads` table columns
interface Lead {
    id: string;
    // The DB column is `business_name`, but some rows from the old
    // addToCRM call may use `name`. Handle both gracefully.
    business_name?: string;
    name?: string;
    email?: string;
    phone?: string;
    service_category?: string;
    // The DB may use `notes` or `message` — handle both
    message?: string | null;
    notes?: string | null;
    budget?: string | null;
    status?: string | null;
    created_at: string;
    source?: string | null;
    city?: string | null;
    score?: number | null;
    website_link?: string | null;
}

// Safe helpers to avoid [object Object]
function leadName(lead: Lead): string {
    const raw = lead.business_name ?? lead.name ?? '';
    return typeof raw === 'string' ? raw : String(raw ?? '');
}

function leadMessage(lead: Lead): string {
    const raw = lead.message ?? lead.notes ?? '';
    return typeof raw === 'string' ? raw : String(raw ?? '');
}

function safeStr(val: unknown): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');

    const [importOpen, setImportOpen] = useState(false);

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
        setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l));
        await supabase.from('leads').update({ status: newStatus }).eq('id', id);
    };

    const filteredLeads = leads.filter(lead => {
        const name = leadName(lead).toLowerCase();
        const email = safeStr(lead.email).toLowerCase();
        const q = search.toLowerCase();
        const matchesSearch = !q || name.includes(q) || email.includes(q);
        const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string | null | undefined) => {
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
            <ImportModal
                isOpen={importOpen}
                onClose={() => { setImportOpen(false); fetchLeads(); }}
                apiEndpoint="/api/admin/leads/import"
                sourceLabel="file_import"
                enableWhatsApp={false}
                onSuccess={() => fetchLeads()}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">CRM &amp; Leads</h1>
                    <p className="text-[var(--muted)]">Manage incoming inquiries and potential clients</p>
                </div>
                <button
                    onClick={() => setImportOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--secondary)] border border-[var(--border)] text-sm font-semibold hover:border-[var(--primary)]/50 transition-colors"
                >
                    <Upload className="w-4 h-4" />
                    Import contacts
                </button>
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
                    filteredLeads.map((lead, index) => {
                        const name = leadName(lead) || 'Unknown';
                        const msg = leadMessage(lead);
                        const email = safeStr(lead.email);
                        const phone = safeStr(lead.phone);
                        const budget = safeStr(lead.budget);
                        const category = safeStr(lead.service_category) || safeStr(lead.city) || 'General Inquiry';
                        const status = safeStr(lead.status) || 'New';

                        return (
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
                                            <h3 className="text-lg font-bold">{name}</h3>
                                            <p className="text-sm text-[var(--muted)]">{category}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(status)}`}>
                                            {status}
                                        </span>
                                    </div>

                                    {msg && (
                                        <p className="text-sm text-[var(--foreground)]/80 line-clamp-2 mb-4 bg-[var(--secondary)]/30 p-3 rounded-lg">
                                            &ldquo;{msg}&rdquo;
                                        </p>
                                    )}

                                    <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                                        {email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4" />
                                                <a href={`mailto:${email}`} className="hover:text-[var(--primary)] transition-colors">{email}</a>
                                            </div>
                                        )}
                                        {phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4" />
                                                <a href={`tel:${phone}`} className="hover:text-[var(--primary)] transition-colors">{phone}</a>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {budget && (
                                            <div className="flex items-center gap-2 px-2 py-0.5 bg-[var(--secondary)] rounded text-xs font-medium">
                                                <span>Budget: {budget}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex lg:flex-col items-center justify-center gap-2 pt-4 lg:pt-0 lg:pl-6 lg:border-l border-[var(--border)] shrink-0">
                                    <p className="text-xs font-medium text-[var(--muted)] mb-2 uppercase hidden lg:block">Move To</p>
                                    <div className="flex lg:flex-col gap-2 w-full">
                                        {status !== 'Contacted' && (
                                            <button
                                                onClick={() => updateStatus(lead.id, 'Contacted')}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 transition-colors w-full justify-center"
                                            >
                                                <Clock className="w-3 h-3" /> Contacted
                                            </button>
                                        )}
                                        {status !== 'Closed' && (
                                            <button
                                                onClick={() => updateStatus(lead.id, 'Closed')}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors w-full justify-center"
                                            >
                                                <CheckCircle2 className="w-3 h-3" /> Close Deal
                                            </button>
                                        )}
                                        {status !== 'Follow Up' && status !== 'Closed' && (
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
                        );
                    })
                )}
            </div>
        </div>
    );
}
