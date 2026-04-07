'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, RefreshCw, Loader2, Mail, User, Phone, CheckCircle2, Clock, XCircle, AlertCircle, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AddToCampaignModal from '@/components/admin/growth/AddToCampaignModal';

interface Lead {
    id: string;
    email: string;
    name: string;
    status: 'pending' | 'sent' | 'replied' | 'bounced' | 'completed';
    created_at: string;
    campaign_id: string;
    campaigns: {
        id: string;
        name: string;
    };
    current_step: number;
}

interface Campaign {
    id: string;
    name: string;
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [selectedCampaign, setSelectedCampaign] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');

    useEffect(() => {
        fetchCampaigns();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchLeads();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [search, selectedCampaign, selectedStatus]);

    const fetchCampaigns = async () => {
        try {
            const res = await fetch('/api/admin/growth/campaigns');
            const data = await res.json();
            if (data.success) {
                setCampaigns(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch campaigns', error);
        }
    };

    const fetchLeads = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('q', search);
            if (selectedCampaign !== 'all') params.append('campaignId', selectedCampaign);
            if (selectedStatus !== 'all') params.append('status', selectedStatus);

            const res = await fetch(`/api/admin/growth/leads?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setLeads(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch leads', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusChip = (status: string) => {
        switch (status) {
            case 'replied': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Replied</span>;
            case 'sent': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 flex items-center gap-1 w-fit"><Mail className="w-3 h-3" /> Sent</span>;
            case 'bounced': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" /> Bounced</span>;
            case 'completed': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-[var(--muted)]/10 text-[var(--muted)] flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
            default: return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-500 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Pending</span>;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <User className="w-8 h-8 text-indigo-500" />
                        Leads Database
                    </h1>
                    <p className="text-[var(--muted)] mt-1">
                        View and manage all prospects across your marketing campaigns.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fetchLeads()}
                        disabled={isLoading}
                        className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-blue-600 transition-colors flex items-center gap-2 font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add Lead
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                </div>

                <select
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    className="p-2 rounded-xl bg-[var(--background)] border border-[var(--border)] outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                    <option value="all">All Campaigns</option>
                    {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="p-2 rounded-xl bg-[var(--background)] border border-[var(--border)] outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="sent">Sent</option>
                    <option value="replied">Replied</option>
                    <option value="bounced">Bounced</option>
                </select>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <table className="w-full">
                    <thead className="bg-[var(--secondary)]/50 border-b border-[var(--border)]">
                        <tr>
                            <th className="text-left p-4 text-sm font-medium text-[var(--muted)]">Name / Email</th>
                            <th className="text-left p-4 text-sm font-medium text-[var(--muted)]">Campaign</th>
                            <th className="text-left p-4 text-sm font-medium text-[var(--muted)]">Status</th>
                            <th className="text-left p-4 text-sm font-medium text-[var(--muted)]">Added</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                        {isLoading && leads.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--primary)]" />
                                </td>
                            </tr>
                        ) : leads.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-[var(--muted)]">
                                    No leads found matching your filters.
                                </td>
                            </tr>
                        ) : (
                            leads.map((lead, index) => (
                                <motion.tr
                                    key={lead.id}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0, transition: { delay: index * 0.03 } }}
                                    className="group hover:bg-[var(--secondary)]/30 transition-colors"
                                >
                                    <td className="p-4">
                                        <div className="font-medium text-[var(--foreground)]">{lead.name || 'Unknown'}</div>
                                        <div className="text-sm text-[var(--muted)]">{lead.email}</div>
                                    </td>
                                    <td className="p-4">
                                        {lead.campaigns ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)] text-xs font-medium">
                                                {lead.campaigns.name}
                                            </span>
                                        ) : (
                                            <span className="text-[var(--muted)] text-xs italic">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {getStatusChip(lead.status)}
                                    </td>
                                    <td className="p-4 text-sm text-[var(--muted)]">
                                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <AddToCampaignModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    fetchLeads(); // Refresh after add
                }}
                leadData={{ source: 'Manual Entry' }}
            />
        </div >
    );
}
