'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Zap, LogOut, Users, TrendingUp, Clock,
    RefreshCw, Mail, Phone, FileText, ExternalLink,
    CheckCircle, Clock3, XCircle, Loader2, ChevronDown, BarChart3,
    ArrowUpDown, ArrowDownUp, Trash2, IndianRupee, Pencil, Search, Globe, Sparkles
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { supabase, type Lead, type PotentialLead } from '@/lib/supabase';

const statusConfig = {
    New: { color: 'bg-blue-500', icon: Clock3, label: 'New' },
    Contacted: { color: 'bg-yellow-500', icon: Phone, label: 'Contacted' },
    'Follow Up': { color: 'bg-purple-500', icon: Clock3, label: 'Follow Up' },
    Closed: { color: 'bg-green-500', icon: CheckCircle, label: 'Closed' },
};

export default function AdminDashboard() {
    const router = useRouter();
    // const supabase = createClientComponentClient(); -> using imported instance
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [filter, setFilter] = useState<'all' | 'New' | 'Contacted' | 'Follow Up' | 'Closed'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'value'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Lead Gen State
    const [activeTab, setActiveTab] = useState<'leads' | 'generator'>('leads');
    const [genCity, setGenCity] = useState('');
    const [genCategory, setGenCategory] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [potentialLeads, setPotentialLeads] = useState<PotentialLead[]>([]);

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/leads', {
                headers: { 'Cache-Control': 'no-cache' }
            });
            const data = await response.json();

            // Merge valid API data with fallback data if needed, or just use API data
            const allLeads: Lead[] = data.success && Array.isArray(data.data) ? data.data : [];

            // Deduplicate by ID
            const uniqueLeads = Array.from(new Map(allLeads.map((item) => [item.id, item])).values());

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

    const handleDeleteLead = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;

        try {
            const response = await fetch(`/api/admin/leads?id=${id}`, { method: 'DELETE' });
            const data = await response.json();

            if (data.success) {
                // Remove locally to update UI instantly
                setLeads(prev => prev.filter(l => l.id !== id));
                if (selectedLead?.id === id) setSelectedLead(null);
            } else {
                alert('Failed to delete lead: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete lead');
        }
    };

    const handleLogout = async () => {
        await fetch('/api/admin/login', { method: 'DELETE' });
        router.push('/admin');
    };

    // Lead Gen Handlers
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

    const handleGenerateLeads = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        setPotentialLeads([]);
        setSelectedLeads(new Set());
        try {
            const res = await fetch('/api/admin/lead-gen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city: genCity, category: genCategory, limit: 10 })
            });
            const data = await res.json();
            if (data.success) {
                setPotentialLeads(data.data);
            } else {
                alert('Generation failed: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to generate leads');
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleSelectLead = (id: string) => {
        const newSelected = new Set(selectedLeads);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedLeads(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedLeads.size === potentialLeads.length) {
            setSelectedLeads(new Set());
        } else {
            setSelectedLeads(new Set(potentialLeads.map(l => l.id)));
        }
    };

    const handleBulkApprove = async () => {
        if (selectedLeads.size === 0) return;

        const leadsToApprove = potentialLeads.filter(l => selectedLeads.has(l.id));

        try {
            const { error } = await supabase
                .from('leads')
                .insert(leadsToApprove.map(lead => ({
                    name: lead.business_name,
                    email: '',
                    phone: lead.phone || '',
                    service_category: 'web',
                    status: 'New',
                    city: lead.city,
                    business_type: genCategory,
                    website_link: lead.website,
                    google_map_link: lead.address,
                    source: 'AI Generator'
                })));

            if (error) throw error;

            // Remove approved from list
            setPotentialLeads(prev => prev.filter(l => !selectedLeads.has(l.id)));
            setSelectedLeads(new Set());
            alert(`Successfully added ${leadsToApprove.length} leads to CRM!`);
            fetchLeads();
        } catch (err: any) {
            alert('Error in bulk approve: ' + err.message);
        }
    };

    const handleApproveLead = async (lead: PotentialLead) => {
        // Convert PotentialLead to real Lead
        // In a real app, you'd call an API to move it in DB.
        // Here we simulate by adding to leads list and updating local state
        try {
            const newLeadPayload = {
                name: lead.business_name,
                email: 'pending@lookup.com', // Placeholder
                phone: lead.phone || '',
                service_category: 'web',
                business_type: lead.category,
                city: lead.city,
                website_link: lead.website || '',
                source: 'manual_entry',
                status: 'New',
                notes: `Auto-generated. AI Score: ${lead.ai_score}`
            };

            const response = await fetch('/api/admin/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLeadPayload),
            });

            if (response.ok) {
                setPotentialLeads(prev => prev.filter(p => p.id !== lead.id));
                fetchLeads(); // Refresh main list
            }
        } catch (e) {
            console.error("Failed to approve", e);
        }
    };

    const handleRejectLead = (id: string) => {
        setPotentialLeads(prev => prev.filter(p => p.id !== id));
        // Optionally call API to mark as rejected in DB
    };

    const filteredLeads = leads
        .filter(lead => filter === 'all' || lead.status === filter)
        .sort((a, b) => {
            if (sortBy === 'date') {
                return sortOrder === 'desc'
                    ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            } else {
                return sortOrder === 'desc'
                    ? (b.deal_value || 0) - (a.deal_value || 0)
                    : (a.deal_value || 0) - (b.deal_value || 0);
            }
        });

    const stats = {
        total: leads.length,
        new: leads.filter(l => l.status === 'New').length,
        contacted: leads.filter(l => l.status === 'Contacted').length,
        closed: leads.filter(l => l.status === 'Closed').length,
        totalValue: leads.reduce((sum, l) => sum + (l.deal_value || 0), 0)
    };

    const statusData = [
        { name: 'New', value: stats.new, color: '#3b82f6' },
        { name: 'Contacted', value: stats.contacted + leads.filter(l => l.status === 'Follow Up').length, color: '#eab308' },
        { name: 'Closed', value: stats.closed, color: '#22c55e' },
    ].filter(d => d.value > 0);

    const revenueData = leads
        .filter(l => l.deal_value && l.deal_value > 0)
        .map(l => ({ name: l.name.split(' ')[0], value: l.deal_value }))
        .sort((a, b) => (b.value || 0) - (a.value || 0))
        .slice(0, 5);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newClient, setNewClient] = useState<{
        name: string;
        email: string;
        phone: string;
        service_category: string;
        business_type: string;
        city: string;
        google_map_link: string;
        website_link: string;
        is_followup: boolean;
        notes: string;
        status: string;
        deal_value?: string;
    }>({
        name: '',
        email: '',
        phone: '',
        service_category: 'web',
        business_type: '',
        city: '',
        google_map_link: '',
        website_link: '',
        is_followup: false,
        notes: '',
        status: 'New',
        deal_value: ''
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const payload = {
                ...newClient,
                deal_value: newClient.deal_value ? parseFloat(newClient.deal_value) : 0
            };

            const url = editingId ? '/api/admin/leads' : '/api/admin/leads';
            const method = editingId ? 'PATCH' : 'POST';
            const body = editingId ? { id: editingId, ...payload } : payload;

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await response.json();

            if (data.success) {
                // Refresh all leads to ensure consistency and avoid type issues
                fetchLeads();

                // If editing the currently selected lead, update it too
                if (editingId && selectedLead?.id === editingId) {
                    // Fetch the updated single lead or just merge locally (safe merge)
                    const updatedLead = { ...selectedLead, ...payload, updated_at: new Date().toISOString() } as Lead;
                    setSelectedLead(updatedLead);
                }

                setShowAddModal(false);
                setNewClient({
                    name: '',
                    email: '',
                    phone: '',
                    service_category: 'web',
                    business_type: '',
                    city: '',
                    google_map_link: '',
                    website_link: '',
                    is_followup: false,
                    notes: '',
                    status: 'New',
                    deal_value: ''
                });
                setEditingId(null);
            }
        } catch (error) {
            console.error('Failed to save client:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const openEditModal = (lead: Lead) => {
        setNewClient({
            name: lead.name,
            email: lead.email || '',
            phone: lead.phone || '',
            service_category: lead.service_category,
            business_type: lead.business_type || '',
            city: lead.city || '',
            google_map_link: lead.google_map_link || '',
            website_link: lead.website_link || '',
            is_followup: lead.is_followup || false,
            notes: lead.notes || '',
            status: lead.status,
            deal_value: lead.deal_value ? String(lead.deal_value) : ''
        });
        setEditingId(lead.id);
        setShowAddModal(true);
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
                            <motion.button
                                onClick={() => { setShowAddModal(true); setEditingId(null); setNewClient({ name: '', email: '', phone: '', service_category: 'web', business_type: '', city: '', google_map_link: '', website_link: '', is_followup: false, notes: '', status: 'New', deal_value: '' }); }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white 
                                     hover:bg-blue-600 transition-colors text-sm font-medium"
                            >
                                <Users className="w-4 h-4" />
                                Add Client
                            </motion.button>
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

                            <div className="h-6 w-[1px] bg-[var(--border)] mx-2"></div>

                            <div className="flex bg-[var(--secondary)] p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('leads')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'leads' ? 'bg-[var(--surface)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                                >
                                    CRM
                                </button>
                                <button
                                    onClick={() => setActiveTab('generator')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'generator' ? 'bg-[var(--surface)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                                >
                                    Generator
                                </button>
                            </div>

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
                {activeTab === 'leads' ? (
                    <>
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
                                title="Pipeline Value"
                                value={`₹${stats.totalValue.toLocaleString()}`}
                                icon={IndianRupee}
                                color="text-green-400"
                            />
                            <StatCard
                                title="Total Value"
                                value={`₹${stats.totalValue.toLocaleString()}`}
                                icon={IndianRupee}
                                color="text-green-500"
                                isCurrency
                            />                </div>

                        {/* Analytics Graphs */}
                        <div className="grid lg:grid-cols-2 gap-8 mb-8">
                            <div className="glass-card p-6">
                                <h3 className="font-bold mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-[var(--primary)]" />
                                    Revenue Pipeline (Top 5)
                                </h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={revenueData}>
                                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                                            <RechartsTooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{ backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                            />
                                            <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="glass-card p-6">
                                <h3 className="font-bold mb-4 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-purple-500" />
                                    Lead Status Distribution
                                </h3>
                                <div className="h-64 w-full flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={statusData}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {statusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-3 gap-8">
                            {/* Leads List */}
                            <div className="lg:col-span-2">
                                <div className="glass-card overflow-hidden">
                                    <div className="p-4 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
                                        <h2 className="font-bold">Inquiry Feed</h2>
                                        <div className="flex gap-2">
                                            {(['all', 'New', 'Contacted', 'Follow Up', 'Closed'] as const).map((status) => (
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

                                            <div className="w-[1px] h-6 bg-[var(--border)] mx-1" />

                                            <button
                                                onClick={() => {
                                                    if (sortBy === 'value') {
                                                        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                                    } else {
                                                        setSortBy('value');
                                                        setSortOrder('desc');
                                                    }
                                                }}
                                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${sortBy === 'value'
                                                    ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                                    : 'bg-[var(--secondary)] hover:bg-[var(--border)]'
                                                    }`}
                                            >
                                                <IndianRupee className="w-3 h-3" />
                                                Value
                                                {sortBy === 'value' && (
                                                    sortOrder === 'desc' ? <ArrowDownUp className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3" />
                                                )}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    if (sortBy === 'date') {
                                                        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                                    } else {
                                                        setSortBy('date');
                                                        setSortOrder('desc');
                                                    }
                                                }}
                                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${sortBy === 'date'
                                                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                                    : 'bg-[var(--secondary)] hover:bg-[var(--border)]'
                                                    }`}
                                            >
                                                <Clock className="w-3 h-3" />
                                                Date
                                                {sortBy === 'date' && (
                                                    sortOrder === 'desc' ? <ArrowDownUp className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3" />
                                                )}
                                            </button>
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
                                                    onSelect={() => setSelectedLead(lead)}
                                                    isSelected={selectedLead?.id === lead.id}
                                                    openEditModal={openEditModal}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Lead Details Panel */}
                            <div className="lg:col-span-1">
                                <div className="glass-card p-6 sticky top-24">
                                    <div className="flex items-center gap-2 mb-4">
                                        <FileText className="w-5 h-5 text-[var(--primary)]" />
                                        <h2 className="font-bold">Lead Details</h2>
                                    </div>

                                    {selectedLead ? (
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-xl bg-[var(--secondary)]">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="font-medium text-lg">{selectedLead.name}</p>
                                                        <p className="text-sm text-[var(--muted)]">{selectedLead.email}</p>
                                                    </div>
                                                    {selectedLead.deal_value && (
                                                        <div className="text-right">
                                                            <p className="text-sm text-[var(--muted)]">Deal Value</p>
                                                            <p className="font-bold text-green-500">₹{selectedLead.deal_value.toLocaleString()}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {selectedLead.phone && (
                                                    <p className="text-sm text-[var(--muted)] flex items-center gap-2 mb-2">
                                                        <Phone className="w-3 h-3" /> {selectedLead.phone}
                                                    </p>
                                                )}

                                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                                    <span className="px-2 py-0.5 rounded text-xs bg-[var(--primary)]/10 text-[var(--primary)]">
                                                        {selectedLead.service_category}
                                                    </span>
                                                    {selectedLead.budget && (
                                                        <span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400">
                                                            {selectedLead.budget}
                                                        </span>
                                                    )}
                                                </div>
                                                {selectedLead.source === 'manual_entry' && (
                                                    <div className="mt-2 pt-2 border-t border-[var(--border)] text-xs text-[var(--muted)]">
                                                        <p><span className="font-semibold">Business:</span> {selectedLead.business_type || 'N/A'}</p>
                                                        <p><span className="font-semibold">City:</span> {selectedLead.city || 'N/A'}</p>
                                                        {selectedLead.website_link && (
                                                            <a href={selectedLead.website_link} target="_blank" className="text-[var(--primary)] hover:underline block truncate">
                                                                Website
                                                            </a>
                                                        )}
                                                        {selectedLead.google_map_link && (
                                                            <a href={selectedLead.google_map_link} target="_blank" className="text-[var(--primary)] hover:underline block truncate">
                                                                Map Link
                                                            </a>
                                                        )}
                                                        {selectedLead.notes && (
                                                            <p className="mt-1 italic">&quot;{selectedLead.notes}&quot;</p>
                                                        )}
                                                    </div>
                                                )}


                                                <div className="mt-4 pt-4 border-t border-[var(--border)] flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(selectedLead)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                        Edit Client
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteLead(selectedLead.id, selectedLead.name)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Delete Client
                                                    </button>
                                                </div>
                                            </div>

                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <FileText className="w-12 h-12 mx-auto mb-4 text-[var(--muted)] opacity-50" />
                                            <p className="text-[var(--muted)]">
                                                Select a lead to view details
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="max-w-4xl mx-auto">
                        <div className="glass-card p-8 mb-8">
                            <h2 className="text-2xl font-bold mb-2">Auto Lead Generator</h2>
                            <p className="text-[var(--muted)] mb-6">Find and qualify local businesses using AI and Maps data.</p>

                            <form onSubmit={handleGenerateLeads} className="grid md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Target City</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                                        <input
                                            value={genCity}
                                            onChange={e => setGenCity(e.target.value)}
                                            placeholder="e.g. Mumbai, Delhi"
                                            className="w-full pl-9 pr-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Business Category</label>
                                    <input
                                        value={genCategory}
                                        onChange={e => setGenCategory(e.target.value)}
                                        placeholder="e.g. Real Estate, Dentists"
                                        className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
                                        required
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="submit"
                                        disabled={isGenerating}
                                        className="w-full py-2 bg-[var(--primary)] text-white rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                    >
                                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        {isGenerating ? 'Scraping...' : 'Find Leads'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {potentialLeads.length > 0 && (
                            <div className="glass-card overflow-hidden">
                                <div className="p-4 border-b border-[var(--border)]">
                                    <h3 className="font-bold">Found {potentialLeads.length} Potential Leads</h3>
                                </div>
                                <div className="divide-y divide-[var(--border)]">
                                    {potentialLeads.map(lead => (
                                        <div key={lead.id} className="p-4 hover:bg-[var(--secondary)]/50 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold">{lead.business_name}</h4>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${lead.ai_score > 70 ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                                        Score: {lead.ai_score}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-[var(--muted)] mb-1">{lead.address}</p>
                                                <div className="flex gap-4 text-xs">
                                                    {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>}
                                                    {lead.website ? (
                                                        <a href={lead.website} target="_blank" className="flex items-center gap-1 text-blue-400 hover:underline"><Globe className="w-3 h-3" /> Website Found</a>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[var(--muted)] opacity-50"><Globe className="w-3 h-3" /> No Website</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 w-full md:w-auto">
                                                <button
                                                    onClick={() => handleRejectLead(lead.id)}
                                                    className="flex-1 md:flex-none px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleApproveLead(lead)}
                                                    className="flex-1 md:flex-none px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs hover:bg-blue-600 transition-colors"
                                                >
                                                    Add to CRM
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {potentialLeads.length === 0 && !isGenerating && (
                            <div className="text-center py-12 opacity-50">
                                <Search className="w-12 h-12 mx-auto mb-2" />
                                <p>Enter a city and category to start finding leads</p>
                            </div>
                        )}
                    </div>
                )}
            </main >

            {/* Add Client Modal */}
            <AnimatePresence>
                {
                    showAddModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-[var(--border)]"
                            >
                                <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--secondary)]">
                                    <h3 className="font-bold">{editingId ? 'Edit Client Details' : 'Add New Client manually'}</h3>
                                    <button onClick={() => { setShowAddModal(false); setEditingId(null); setNewClient({ name: '', email: '', phone: '', service_category: 'web', business_type: '', city: '', google_map_link: '', website_link: '', is_followup: false, notes: '', status: 'New', deal_value: '' }); }} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                </div>
                                <form onSubmit={handleAddClient} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            placeholder="Client Name *"
                                            required
                                            className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] w-full text-sm"
                                            value={newClient.name}
                                            onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                                        />
                                        <input
                                            placeholder="Email"
                                            type="email"
                                            className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] w-full text-sm"
                                            value={newClient.email}
                                            onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                                        />
                                        <input
                                            placeholder="Phone Number"
                                            className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] w-full text-sm"
                                            value={newClient.phone}
                                            onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                                        />
                                        <input
                                            placeholder="Business Type"
                                            className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] w-full text-sm"
                                            value={newClient.business_type}
                                            onChange={e => setNewClient({ ...newClient, business_type: e.target.value })}
                                        />
                                        <input
                                            placeholder="City"
                                            className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] w-full text-sm"
                                            value={newClient.city}
                                            onChange={e => setNewClient({ ...newClient, city: e.target.value })}
                                        />
                                        <select
                                            className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] w-full text-sm"
                                            value={newClient.status || 'New'}
                                            onChange={e => setNewClient({ ...newClient, status: e.target.value })}
                                        >
                                            <option value="New">Status: New</option>
                                            <option value="Contacted">Status: Contacted</option>
                                            <option value="Follow Up">Status: Follow Up</option>
                                            <option value="Closed">Status: Closed</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            placeholder="Deal Value (₹)"
                                            type="number"
                                            className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] w-full text-sm font-mono"
                                            value={newClient.deal_value}
                                            onChange={e => setNewClient({ ...newClient, deal_value: e.target.value })}
                                        />
                                        <input
                                            placeholder="Website Link"
                                            className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] w-full text-sm"
                                            value={newClient.website_link}
                                            onChange={e => setNewClient({ ...newClient, website_link: e.target.value })}
                                        />
                                    </div>
                                    <input
                                        placeholder="Google Map Link"
                                        className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] w-full text-sm"
                                        value={newClient.google_map_link}
                                        onChange={e => setNewClient({ ...newClient, google_map_link: e.target.value })}
                                    />
                                    <textarea
                                        placeholder="Notes / Comments"
                                        className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] w-full text-sm h-24"
                                        value={newClient.notes}
                                        onChange={e => setNewClient({ ...newClient, notes: e.target.value })}
                                    />
                                    <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer bg-[var(--secondary)] p-3 rounded-lg">
                                        <input
                                            type="checkbox"
                                            checked={newClient.is_followup}
                                            onChange={e => setNewClient({ ...newClient, is_followup: e.target.checked })}
                                            className="w-4 h-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                                        />
                                        Mark for Follow Up
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-3 bg-[var(--primary)] text-white rounded-lg font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
                                    >
                                        {isLoading ? 'Adding Client...' : 'Add Client'}
                                    </button>
                                </form>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
}

function StatCard({
    title,
    value,
    icon: Icon,
    color,
    isCurrency
}: {
    title: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
    isCurrency?: boolean;
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
            <p className={`text-2xl font-bold ${isCurrency ? 'font-mono' : ''}`}>{value}</p>
        </motion.div>
    );
}

function LeadCard({
    lead,
    onStatusChange,
    onSelect,
    isSelected,
    openEditModal
}: {
    lead: Lead;
    onStatusChange: (id: string, status: 'New' | 'Contacted' | 'Closed') => void;
    onSelect: () => void;
    isSelected: boolean;
    openEditModal: (lead: Lead) => void;
}) {
    const [showDropdown, setShowDropdown] = useState(false);
    const status = statusConfig[lead.status] || statusConfig['New'];

    return (
        <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-4 hover:bg-[var(--secondary)]/50 transition-colors cursor-pointer ${isSelected ? 'bg-[var(--primary)]/5 border-l-2 border-[var(--primary)]' : ''
                }`}
            onClick={onSelect}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{lead.name}</h3>
                        {lead.source === 'manual_entry' && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20">Manual</span>
                        )}
                        {lead.deal_value && lead.deal_value > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 font-mono">
                                ₹{lead.deal_value.toLocaleString()}
                            </span>
                        )}
                        <span className={`w-2 h-2 rounded-full ${status.color}`} />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(lead);
                            }}
                            className="p-1 hover:bg-[var(--surface)] rounded text-[var(--muted)] hover:text-[var(--primary)]"
                            title="Edit"
                        >
                            <Pencil className="w-3 h-3" />
                        </button>
                    </div>
                    {lead.business_type && (
                        <p className="text-xs text-[var(--primary)] mb-0.5">{lead.business_type} • {lead.city}</p>
                    )}
                    <p className="text-sm text-[var(--muted)] truncate">{lead.email || lead.phone || 'No contact info'}</p>
                    {lead.is_followup && (
                        <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 font-medium">
                            <Clock3 className="w-3 h-3" /> Follow Up Required
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded text-xs bg-[var(--secondary)] capitalize">
                            {lead.service_category}
                        </span>
                        {lead.budget && (
                            <span className="px-2 py-0.5 rounded text-xs bg-[var(--secondary)]">
                                {lead.budget}
                            </span>
                        )}
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


                </div>
            </div>
        </motion.div>
    );
}
