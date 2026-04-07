'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Mail, Plus, Play, Pause, BarChart3, Users,
    MoreHorizontal, Calendar, Clock, Send, Edit2, Trash2, Loader2, RefreshCw, Rocket, Zap
} from 'lucide-react';

interface Campaign {
    id: string;
    name: string;
    status: string;
    stats_sent: number;
    stats_opened: number;
    stats_replied: number;
    created_at: string;
    steps?: number; // Optional until we join
}

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newCampaignName, setNewCampaignName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Fetch Campaigns from Real API
    const fetchCampaigns = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/growth/campaigns');
            const data = await res.json();
            if (data.success) {
                setCampaigns(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch campaigns', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleCreateCampaign = async () => {
        if (!newCampaignName.trim()) return;
        setIsCreating(true);
        try {
            const res = await fetch('/api/admin/growth/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCampaignName })
            });
            const data = await res.json();
            if (data.success) {
                setCampaigns([data.data, ...campaigns]); // Optimistic update
                setIsCreateModalOpen(false);
                setNewCampaignName('');
            } else {
                alert('Failed to create: ' + data.error);
            }
        } catch (error) {
            console.error('Create error', error);
            alert('Failed to connect to server');
        } finally {
            setIsCreating(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-green-500 bg-green-500/10';
            case 'paused': return 'text-yellow-500 bg-yellow-500/10';
            default: return 'text-[var(--muted)] bg-[var(--secondary)]';
        }
    };

    const handleRunQueue = async () => {
        if (!confirm('This will process all active campaigns and send due emails. Continue?')) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/growth/campaigns/process', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert(`Processed ${data.processed} emails.`);
                fetchCampaigns();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to process queue');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Rocket className="w-8 h-8 text-[var(--primary)]" />
                        Campaigns
                    </h1>
                    <p className="text-[var(--muted)] mt-1">
                        Manage your cold outreach and automated sequences.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchCampaigns}
                        disabled={isLoading}
                        className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleRunQueue}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2 font-medium shadow-lg shadow-green-500/20"
                    >
                        <Zap className="w-4 h-4" />
                        Run Queue
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-5 h-5" />
                        New Campaign
                    </button>
                </div>
            </div>

            {/* Stats Overview (Real Aggregates) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                        <Mail className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-[var(--muted)]">Total Sent</p>
                        <h3 className="text-2xl font-bold">
                            {campaigns.reduce((acc, c) => acc + (c.stats_sent || 0), 0).toLocaleString()}
                        </h3>
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-500/10 text-green-500">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-[var(--muted)]">Total Replied</p>
                        <h3 className="text-2xl font-bold">
                            {campaigns.reduce((acc, c) => acc + (c.stats_replied || 0), 0).toLocaleString()}
                        </h3>
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-purple-500/10 text-purple-500">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-[var(--muted)]">Active Campaigns</p>
                        <h3 className="text-2xl font-bold">
                            {campaigns.filter(c => c.status === 'active').length}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Campaigns List */}
            <div className="glass-card overflow-hidden">
                {isLoading && campaigns.length === 0 ? (
                    <div className="p-10 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="p-10 text-center text-[var(--muted)]">
                        No campaigns found. Create your first one!
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border)] text-[var(--muted)] text-sm uppercase tracking-wider">
                                <th className="p-6 font-medium">Campaign Name</th>
                                <th className="p-6 font-medium">Status</th>
                                <th className="p-6 font-medium">Stats (Sent / Open / Reply)</th>
                                <th className="p-6 font-medium">Created</th>
                                <th className="p-6 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {campaigns.map((campaign) => (
                                <tr key={campaign.id} className="group hover:bg-[var(--secondary)]/30 transition-colors">
                                    <td className="p-6">
                                        <a href={`/admin/dashboard/growth/campaigns/${campaign.id}`} className="block group-hover:text-[var(--primary)] transition-colors">
                                            <h3 className="font-bold flex items-center gap-2">
                                                {campaign.name}
                                            </h3>
                                            <p className="text-xs text-[var(--muted)] mt-1">{campaign.id.substring(0, 8)}...</p>
                                        </a>
                                    </td>
                                    <td className="p-6">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${getStatusColor(campaign.status)}`}>
                                            {campaign.status}
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-4 text-sm font-medium">
                                            <div className="flex flex-col items-center">
                                                <span>{campaign.stats_sent}</span>
                                                <span className="text-[10px] text-[var(--muted)]">Sent</span>
                                            </div>
                                            <div className="h-4 w-px bg-[var(--border)]" />
                                            <div className="flex flex-col items-center text-green-500">
                                                <span>{campaign.stats_opened}</span>
                                                <span className="text-[10px] text-[var(--muted)]">Open</span>
                                            </div>
                                            <div className="h-4 w-px bg-[var(--border)]" />
                                            <div className="flex flex-col items-center text-purple-500">
                                                <span>{campaign.stats_replied}</span>
                                                <span className="text-[10px] text-[var(--muted)]">Reply</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 text-sm text-[var(--muted)]">
                                        {new Date(campaign.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 rounded-lg hover:bg-[var(--background)] border border-transparent hover:border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-all">
                                                {campaign.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                            </button>
                                            <button className="p-2 rounded-lg hover:bg-[var(--background)] border border-transparent hover:border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-all">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-[var(--muted)] hover:text-red-500 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Modal - Real Implementation */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl"
                    >
                        <h2 className="text-xl font-bold mb-4">Create New Campaign</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-[var(--muted)] mb-1 block">Campaign Name</label>
                                <input
                                    type="text"
                                    value={newCampaignName}
                                    onChange={(e) => setNewCampaignName(e.target.value)}
                                    placeholder="e.g. Q1 Outreach"
                                    autoFocus
                                    className="w-full p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCampaign()}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 rounded-lg hover:bg-[var(--secondary)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateCampaign}
                                    disabled={isCreating || !newCampaignName.trim()}
                                    className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create Draft
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
