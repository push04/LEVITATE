'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Mail, Send, Users, FileText,
    CheckCircle, AlertCircle, Loader2, History
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Campaign {
    id: string;
    title: string;
    subject: string;
    status: string;
    sent_count: number;
    created_at: string;
}

export default function CampaignsPage() {
    const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

    // Form State
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [audience, setAudience] = useState('all');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // History State
    const [history, setHistory] = useState<Campaign[]>([]);

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab]);

    const fetchHistory = async () => {
        const { data } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setHistory(data);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const res = await fetch('/api/sales/send-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    subject,
                    body,
                    targetAudience: audience,
                    userId: user.id
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to send campaign');

            setMessage({ type: 'success', text: `Campaign launched! Sent ${data.sent} emails.` });

            // Reset form
            setTitle('');
            setSubject('');
            setBody('');
            setAudience('all');

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 h-[calc(100vh-64px)] overflow-hidden flex flex-col max-w-[1200px] mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                        <Mail className="w-8 h-8 text-purple-500" />
                        The Broadcaster <span className="text-lg text-[var(--muted)] font-normal">/ Email Marketing</span>
                    </h1>
                    <p className="text-[var(--muted)]">Design and launch high-conversion email campaigns.</p>
                </div>

                <div className="flex bg-[var(--secondary)] p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'new' ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                    >
                        New Campaign
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                    >
                        History
                    </button>
                </div>
            </div>

            {activeTab === 'new' ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSend} className="glass-card p-8 rounded-2xl border border-[var(--border)] max-w-3xl mx-auto">

                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-4 mb-6 rounded-xl flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                            >
                                {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                {message.text}
                            </motion.div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-bold mb-2 text-[var(--foreground)]">Campaign Title</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Internal Name (e.g. Q1 Outreach)"
                                    className="w-full p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:ring-2 ring-purple-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2 text-[var(--foreground)]">Target Audience</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                                    <select
                                        value={audience}
                                        onChange={(e) => setAudience(e.target.value)}
                                        className="w-full pl-10 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:ring-2 ring-purple-500 outline-none appearance-none"
                                    >
                                        <option value="all">All Leads</option>
                                        <option value="new_leads">New Leads Only</option>
                                        <option value="contacted">Contacted Leads</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold mb-2 text-[var(--foreground)]">Email Subject</label>
                            <input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Subject Line"
                                className="w-full p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:ring-2 ring-purple-500 outline-none"
                                required
                            />
                        </div>

                        <div className="mb-8">
                            <label className="block text-sm font-bold mb-2 text-[var(--foreground)]">Email Body</label>
                            <div className="relative">
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="Hi {{name}}, I noticed your business..."
                                    className="w-full p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:ring-2 ring-purple-500 outline-none h-64 resize-none font-mono text-sm leading-relaxed"
                                    required
                                />
                                <div className="absolute bottom-4 right-4 text-xs text-[var(--muted)] bg-[var(--surface)] px-2 py-1 rounded border border-[var(--border)]">
                                    Supported variables: {'{{name}}'}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-lg shadow-purple-500/25 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                            {isLoading ? 'Sending Broadcast...' : 'Launch Campaign'}
                        </button>

                    </form>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid gap-4">
                        {history.map((campaign) => (
                            <div key={campaign.id} className="glass-card p-6 rounded-xl border border-[var(--border)] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-purple-500/10 text-purple-500">
                                        <History className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{campaign.title}</h3>
                                        <p className="text-sm text-[var(--muted)]">{campaign.subject}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold">{campaign.sent_count}</div>
                                    <div className="text-xs text-[var(--muted)] uppercase tracking-wider">Emails Sent</div>
                                    <div className={`mt-1 text-xs font-bold inline-block px-2 py-0.5 rounded ${campaign.status === 'sent' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                        {campaign.status}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {history.length === 0 && (
                            <div className="text-center py-20 text-[var(--muted)]">
                                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>No campaigns found.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
