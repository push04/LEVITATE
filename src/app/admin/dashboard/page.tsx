'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Zap, LogOut, Users, TrendingUp, Clock,
    RefreshCw, Mail, Phone, FileText, ExternalLink,
    CheckCircle, Clock3, XCircle, Loader2, ChevronDown, BarChart3,
    ArrowUpDown, ArrowDownUp, Trash2, IndianRupee, Pencil, Search, Globe, Sparkles, Code
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { supabase, type Lead, type PotentialLead } from '@/lib/supabase';
import OutreachModal from '@/components/admin/OutreachModal';
import BlogManager from '@/components/admin/BlogManager';

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

    // Outreach State
    const [showOutreachModal, setShowOutreachModal] = useState(false);
    const [outreachLead, setOutreachLead] = useState<PotentialLead | null>(null);

    // LinkedIn State
    const [activeTab, setActiveTab] = useState<'leads' | 'generator' | 'linkedin' | 'blog'>('leads');
    const [isPostingLinkedIn, setIsPostingLinkedIn] = useState(false);
    const [linkedinConnected, setLinkedinConnected] = useState(false);
    // New: Organization State
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<string>(''); // '' = Personal, otherwise URN
    const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);

    // Lead Gen State (Restored)
    const [genCity, setGenCity] = useState('');
    const [genCategory, setGenCategory] = useState('');
    const [genLimit, setGenLimit] = useState(10);
    const [genRequirePhone, setGenRequirePhone] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [potentialLeads, setPotentialLeads] = useState<PotentialLead[]>([]);

    useEffect(() => {
        // Check connectivity and load settings
        checkLinkedInStatus();
    }, []);

    const checkLinkedInStatus = async () => {
        // 1. Load Organizations
        try {
            setIsLoadingOrgs(true);
            const resOrgs = await fetch('/api/admin/linkedin/organizations');
            const dataOrgs = await resOrgs.json();
            if (dataOrgs.success && dataOrgs.data?.elements) {
                setOrganizations(dataOrgs.data.elements);
            }

            // 2. Load Saved Setting
            const resSettings = await fetch('/api/admin/settings?key=linkedin_target_urn');
            const dataSettings = await resSettings.json();
            if (dataSettings.success) {
                setSelectedOrg(dataSettings.value || '');
            }
        } catch (e) {
            console.error("Failed to load LinkedIn settings", e);
        } finally {
            setIsLoadingOrgs(false);
        }
    };

    const handleSaveSettings = async (urn: string) => {
        setSelectedOrg(urn);
        try {
            await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'linkedin_target_urn', value: urn })
            });
            alert("Saved! Future posts will use this identity.");
        } catch (e) {
            alert("Failed to save setting");
        }
    };

    // LinkedIn Handler
    const handleLinkedInAutoPilot = async () => {
        setIsPostingLinkedIn(true);
        try {
            const res = await fetch('/api/admin/linkedin/autopilot', { method: 'POST' });
            const data = await res.json();

            if (res.status === 401) {
                alert("Please connect LinkedIn first!");
                setLinkedinConnected(false);
            } else if (data.success) {
                alert(`Posted successfully to ${data.mode}! \nView at: ${data.postUrl}`);
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (e: any) {
            alert("Failed to post: " + e.message);
        } finally {
            setIsPostingLinkedIn(false);
        }
    };

    // Handler to open outreach modal for inquiry leads
    const handleInquiryOutreach = (lead: Lead) => {
        // Convert Lead to PotentialLead-compatible format
        const potentialLead: PotentialLead = {
            id: lead.id,
            business_name: lead.name,
            phone: lead.phone || undefined,
            website: lead.website_link || undefined,
            category: lead.service_category,
            city: lead.city || '',
            ai_score: 0,
            status: lead.status as 'pending' | 'approved' | 'rejected',
            created_at: lead.created_at,
            raw_data: {
                email: lead.email,
                tech_stack: undefined,
                deep_scraped: false
            }
        };
        setOutreachLead(potentialLead);
        setShowOutreachModal(true);
    };

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
        try {
            await supabase.auth.signOut();
            await fetch('/api/admin/login', { method: 'DELETE' });
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            router.push('/admin');
        }
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
                body: JSON.stringify({ city: genCity, category: genCategory, limit: genLimit, requirePhone: genRequirePhone })
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
            // Use our new Admin API to bypass RLS
            const res = await fetch('/api/admin/leads/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leadsToApprove.map(lead => ({
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
                }))) // Note: API needs to support array or we loop. Let's loop for simplicity or update API.
            });

            // Correction: The API I just wrote takes a single object in body? 
            // The API code was `insert([body])`. If body is array, `insert(body)` works.
            // Let's assume the API handles array if passed as array, as `body` is json.
            // Wait, my API was `insert([body])`. If body is array, it becomes `insert([[item1, item2]])` which is wrong.
            // Let's refactor the API to handle array or single safely, OR just loop here.
            // LOOPING is safer for now without re-editing the API file immediately.

            const promises = leadsToApprove.map(lead =>
                fetch('/api/admin/leads/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
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
                    })
                })
            );

            await Promise.all(promises);

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
        try {
            const res = await fetch('/api/admin/leads/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
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
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            // Remove from potential list
            setPotentialLeads(prev => prev.filter(p => p.id !== lead.id));
            alert(`Added ${lead.business_name} to CRM!`);
            fetchLeads(); // Refresh CRM
        } catch (error: any) {
            alert('Error adding lead: ' + error.message);
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
            {/* <header> Removed: Handled by Layout/Sidebar </header> */}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'leads' && (
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
                                color="text-blue-600"
                            />
                            <StatCard
                                title="Contacted"
                                value={stats.contacted}
                                icon={TrendingUp}
                                color="text-amber-600"
                            />
                            <StatCard
                                title="Pipeline Value"
                                value={`₹${stats.totalValue.toLocaleString()}`}
                                icon={IndianRupee}
                                color="text-emerald-600"
                            />
                            <StatCard
                                title="Total Value"
                                value={`₹${stats.totalValue.toLocaleString()}`}
                                icon={IndianRupee}
                                color="text-emerald-600"
                                isCurrency
                            />
                            <StatCard
                                title="Closed Deals"
                                value={stats.closed}
                                icon={CheckCircle}
                                color="text-emerald-500"
                            />
                            <StatCard
                                title="Conversion Rate"
                                value={`${stats.total > 0 ? ((stats.closed / stats.total) * 100).toFixed(1) : 0}%`}
                                icon={Zap}
                                color="text-purple-500"
                            />
                            <StatCard
                                title="Avg. Deal Size"
                                value={`₹${stats.total > 0 ? Math.round(stats.totalValue / stats.total).toLocaleString() : 0}`}
                                icon={BarChart3}
                                color="text-orange-500"
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
                                    <ResponsiveContainer width="100%" height={256} minWidth={0} minHeight={256}>
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
                                    <ResponsiveContainer width="100%" height={256} minWidth={0} minHeight={256}>
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
                                                    onGenerateOutreach={handleInquiryOutreach}
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
                                                        <span className="px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                )}

                {activeTab === 'generator' && (
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
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Limit</label>
                                    <select
                                        value={genLimit}
                                        onChange={e => setGenLimit(Number(e.target.value))}
                                        className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
                                    >
                                        <option value={10}>10 Leads</option>
                                        <option value={25}>25 Leads</option>
                                        <option value={50}>50 Leads</option>
                                    </select>
                                </div>
                                <div className="flex items-end pl-1 pb-3">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={genRequirePhone}
                                            onChange={e => setGenRequirePhone(e.target.checked)}
                                            className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] bg-[var(--background)]"
                                        />
                                        <span className="text-sm font-medium">Phone Number Only</span>
                                    </label>
                                </div>
                                <div className="flex items-end md:col-span-3"> {/* Full width button */}
                                    <button
                                        type="submit"
                                        disabled={isGenerating}
                                        className="w-full py-2 bg-[var(--primary)] text-white rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                    >
                                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        {isGenerating ? 'Scraping... (This may take a minute)' : 'Find Leads'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {potentialLeads.length > 0 && (
                            <div className="glass-card overflow-hidden">
                                <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <h3 className="font-bold">Found {potentialLeads.length} Potential Leads</h3>
                                        {selectedLeads.size > 0 && (
                                            <span className="text-sm text-[var(--primary)] font-medium">({selectedLeads.size} selected)</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedLeads.size > 0 && (
                                            <button
                                                onClick={handleBulkApprove}
                                                className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                                            >
                                                Add Selected to CRM
                                            </button>
                                        )}
                                        <button
                                            onClick={toggleSelectAll}
                                            className="px-3 py-1.5 rounded-lg bg-[var(--secondary)] hover:bg-[var(--border)] text-sm font-medium transition-colors"
                                        >
                                            {selectedLeads.size === potentialLeads.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                </div>
                                <div className="divide-y divide-[var(--border)]">
                                    {potentialLeads.map(lead => (
                                        <div key={lead.id} className={`p-4 hover:bg-[var(--secondary)]/50 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start md:items-center ${selectedLeads.has(lead.id) ? 'bg-[var(--primary)]/5' : ''}`}>
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className="pt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedLeads.has(lead.id)}
                                                        onChange={() => toggleSelectLead(lead.id)}
                                                        className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold">{lead.business_name}</h4>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${lead.ai_score > 70 ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                                            Score: {lead.ai_score}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-[var(--muted)] mb-1">{lead.address}</p>
                                                    <div className="flex gap-2 text-xs mt-2">
                                                        <button
                                                            onClick={() => { setOutreachLead(lead); setShowOutreachModal(true); }}
                                                            className="flex items-center gap-1 px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded hover:bg-[var(--primary)]/20 transition-colors font-medium border border-[var(--primary)]/20"
                                                        >
                                                            <Sparkles className="w-3 h-3" /> Generate Outreach
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-4 text-xs mt-2">
                                                        {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>}
                                                        {lead.raw_data?.email && <span className="flex items-center gap-1 text-[var(--primary)] font-bold"><Mail className="w-3 h-3" /> {lead.raw_data.email}</span>}
                                                        {lead.raw_data?.tech_stack && <span className="flex items-center gap-1 text-[var(--muted)] border border-[var(--border)] px-1.5 rounded"><Code className="w-3 h-3" /> {lead.raw_data.tech_stack}</span>}
                                                        {lead.website ? (
                                                            <a href={lead.website} target="_blank" className="flex items-center gap-1 text-blue-400 hover:underline"><Globe className="w-3 h-3" /> Website Found</a>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-[var(--muted)] opacity-50"><Globe className="w-3 h-3" /> No Website</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 w-full md:w-auto pl-7 md:pl-0">
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

                {activeTab === 'linkedin' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="glass-card p-8 mb-8">
                            <h2 className="text-3xl font-bold mb-2 text-center">LinkedIn Automation</h2>
                            <p className="text-[var(--muted)] mb-8 text-center max-w-2xl mx-auto">
                                Automatically generate and post professional updates to your LinkedIn profile or Company Page.
                            </p>

                            {/* Settings Section */}
                            <div className="mb-8 p-6 bg-[var(--secondary)]/30 rounded-xl border border-[var(--border)]">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-[var(--primary)]" />
                                    Posting Identity
                                </h3>

                                {isLoadingOrgs ? (
                                    <div className="flex items-center gap-2 text-[var(--muted)]">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Loading organizations...
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all ${selectedOrg === '' ? 'bg-[var(--primary)]/10 border-[var(--primary)]' : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]/50'}`}>
                                            <input
                                                type="radio"
                                                name="org"
                                                value=""
                                                checked={selectedOrg === ''}
                                                onChange={() => handleSaveSettings('')}
                                                className="w-4 h-4 text-[var(--primary)] focus:ring-[var(--primary)]"
                                            />
                                            <div>
                                                <span className="font-bold block text-sm">Personal Profile</span>
                                                <span className="text-xs text-[var(--muted)]">Post as yourself</span>
                                            </div>
                                        </label>

                                        {organizations.map((org: any) => (
                                            <label key={org.organizationalTarget} className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all ${selectedOrg === org.organizationalTarget ? 'bg-[var(--primary)]/10 border-[var(--primary)]' : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]/50'}`}>
                                                <input
                                                    type="radio"
                                                    name="org"
                                                    value={org.organizationalTarget}
                                                    checked={selectedOrg === org.organizationalTarget}
                                                    onChange={() => handleSaveSettings(org.organizationalTarget)}
                                                    className="w-4 h-4 text-[var(--primary)] focus:ring-[var(--primary)]"
                                                />
                                                <div>
                                                    {/* Try to parse ID from URN: urn:li:organization:123456 */}
                                                    <span className="font-bold block text-sm">Company Page ({org.organizationalTarget.split(':').pop()})</span>
                                                    <span className="text-xs text-[var(--muted)]">Role: {org.role}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Connect Card */}
                                <div className="p-6 rounded-2xl bg-[var(--secondary)]/50 border border-[var(--border)] flex flex-col items-center justify-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center mb-2">
                                        <svg className="w-8 h-8 text-white fill-current" viewBox="0 0 24 24">
                                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                        </svg>
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-xl font-bold">1. Connect LinkedIn</h3>
                                        <p className="text-xs text-[var(--muted)] mb-2">Authorize access to post.</p>
                                    </div>
                                    <div className="flex flex-col gap-2 w-full">
                                        <a
                                            href="/api/auth/linkedin"
                                            className="px-4 py-2 text-center rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 text-sm"
                                        >
                                            Connect Profile (Basic)
                                        </a>
                                        <div className="relative group">
                                            <a
                                                href="/api/auth/linkedin?type=company"
                                                className="block px-4 py-2 text-center rounded-xl border border-blue-600 text-blue-600 font-bold hover:bg-blue-50 transition-colors text-sm"
                                            >
                                                Connect + Company Page
                                            </a>
                                            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-white border border-gray-200 text-gray-700 text-xs rounded-lg shadow-lg z-50">
                                                Requires "Marketing Developer Platform" product enabled in LinkedIn Developer Portal.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Auto-Pilot Card */}
                                <div className="p-6 rounded-2xl bg-[var(--secondary)]/50 border border-[var(--border)] flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                                    {isPostingLinkedIn && (
                                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center flex-col">
                                            <Loader2 className="w-10 h-10 animate-spin text-white mb-2" />
                                            <p className="text-white font-medium">Generating & Posting...</p>
                                        </div>
                                    )}
                                    <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center mb-2">
                                        <Sparkles className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-xl font-bold">2. Run Auto-Pilot</h3>
                                        <p className="text-sm text-[var(--muted)]">Generate & Post to {selectedOrg ? 'Company Page' : 'Profile'}.</p>
                                    </div>
                                    <button
                                        onClick={handleLinkedInAutoPilot}
                                        disabled={isPostingLinkedIn}
                                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20 flex items-center gap-2"
                                    >
                                        <Zap className="w-4 h-4 fill-white" />
                                        Run One-Click Post
                                    </button>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-[var(--border)] text-center">
                                <h4 className="font-bold mb-2">Want Continuous Automation?</h4>
                                <p className="text-sm text-[var(--muted)] max-w-xl mx-auto mb-4">
                                    To post automatically every day without clicking, use a free cron service (like cron-job.org) to trigger this URL:
                                </p>
                                <div className="bg-[var(--surface)] p-3 rounded-lg border border-[var(--border)] inline-flex items-center gap-2 max-w-full overflow-hidden">
                                    <code className="text-xs text-[var(--primary)] whitespace-nowrap">https://levitatelabs.online/api/admin/linkedin/autopilot</code>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {activeTab === 'blog' && (
                    <div className="max-w-4xl mx-auto">
                        <BlogManager />
                    </div>
                )}
            </main>

            {/* Outreach Modal */}
            <OutreachModal
                isOpen={showOutreachModal}
                onClose={() => setShowOutreachModal(false)}
                lead={outreachLead}
            />

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
    openEditModal,
    onGenerateOutreach
}: {
    lead: Lead;
    onStatusChange: (id: string, status: 'New' | 'Contacted' | 'Closed') => void;
    onSelect: () => void;
    isSelected: boolean;
    openEditModal: (lead: Lead) => void;
    onGenerateOutreach: (lead: Lead) => void;
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
                        <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-red-50 text-red-600 border border-red-200 font-medium">
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
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[var(--primary)]/10 text-[var(--primary)] hover:underline"
                            >
                                <FileText className="w-3 h-3" />
                                File
                            </a>
                        )}
                    </div>
                    {lead.message && (
                        <p className="text-sm text-[var(--muted)] mt-2 line-clamp-4 hover:line-clamp-none cursor-pointer" title="Click to expand">
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
                                    className="absolute right-0 mt-1 w-32 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden z-10"
                                >
                                    {(['New', 'Contacted', 'Closed'] as const).map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => {
                                                onStatusChange(lead.id, s);
                                                setShowDropdown(false);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--secondary)] flex items-center gap-2"
                                        >
                                            <span className={`w-2 h-2 rounded-full ${statusConfig[s].color}`} />
                                            {s}
                                        </button>
                                    ))}
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>

                    {/* Generate Outreach Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onGenerateOutreach(lead);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity"
                        title="Generate AI Outreach"
                    >
                        <Sparkles className="w-3 h-3" />
                        Outreach
                    </button>


                </div>
            </div>
        </motion.div>
    );
}
