'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Globe, Mail, Phone, Plus,
    CheckCircle, Loader2, AlertCircle, Terminal,
    ExternalLink, Maximize2
} from 'lucide-react';

interface Lead {
    title: string;
    url: string;
    description: string;
    email?: string;
    phone?: string;
    score: number;
    isAdded?: boolean;
}

export default function LeadGeneratorPage() {
    const [niche, setNiche] = useState('');
    const [location, setLocation] = useState('');
    const [deepScan, setDeepScan] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!niche || !location) return;

        setIsLoading(true);
        setError('');
        setLeads([]);
        setLogs(['Initializing Hunter Protocol...']);
        setProgress(0);

        try {
            const res = await fetch('/api/sales/generate-leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ niche, location, deepScan })
            });

            if (!res.body) throw new Error('No response body');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const msg = JSON.parse(line);
                            if (msg.type === 'log') setLogs(prev => [...prev, msg.data]);
                            else if (msg.type === 'progress') setProgress(msg.data);
                            else if (msg.type === 'result') setLeads(prev => [...prev, msg.data]);
                            else if (msg.type === 'error') {
                                setError(msg.data);
                                setLogs(prev => [...prev, `ERROR: ${msg.data}`]);
                            } else if (msg.type === 'done') setIsLoading(false);
                        } catch (e) {
                            // ignore
                        }
                    }
                }
            } catch (streamErr: any) {
                setError(`Stream Error: ${streamErr.message}`);
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const addToCRM = async (lead: Lead, index: number) => {
        try {
            const response = await fetch('/api/admin/leads/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    business_name: lead.title,   // DB column is business_name
                    name: lead.title,             // fallback for older rows
                    website_link: lead.url,
                    email: lead.email || '',
                    phone: lead.phone || '',
                    source: 'AI Hunter',
                    status: 'New',
                    service_category: 'General',
                    notes: `Generated via Lead Hunter.\nDescription: ${lead.description}\nNiche: ${niche}\nLocation: ${location}`
                })
            });

            const json = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof json.error === 'string' ? json.error : 'Failed to add lead');
            }

            setLeads(prev => prev.map((l, i) => i === index ? { ...l, isAdded: true } : l));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            alert('Failed to add: ' + msg);
        }
    };


    return (
        <div className="p-8 min-h-screen pb-24 max-w-[1920px] mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
                            <Globe className="w-8 h-8" />
                        </div>
                        The Hunter
                        <span className="text-xl text-[var(--muted)] font-normal border-l border-[var(--border)] pl-4 ml-2">Lead Generator</span>
                    </h1>
                    <p className="text-[var(--muted)] text-lg max-w-2xl">
                        Identify high-value business targets. The AI searches, filters, and deep-scans websites to find direct contact information.
                    </p>
                </div>
            </div>

            {/* Search Controls */}
            <div className="glass-card p-6 rounded-3xl border border-[var(--border)] mb-8 shadow-xl">
                <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-6 items-end">
                    <div className="flex-1 w-full space-y-2">
                        <label className="text-sm font-bold text-[var(--foreground)] ml-1">Business Niche</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                            <input
                                value={niche}
                                onChange={(e) => setNiche(e.target.value)}
                                placeholder="e.g. Luxury Hotels, Dental Clinics, Law Firms"
                                className="w-full pl-12 pr-4 py-4 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:ring-2 ring-blue-500 outline-none transition-all text-lg"
                            />
                        </div>
                    </div>

                    <div className="flex-1 w-full space-y-2">
                        <label className="text-sm font-bold text-[var(--foreground)] ml-1">Target Location</label>
                        <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                            <input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="e.g. New York, Delhi, London"
                                className="w-full pl-12 pr-4 py-4 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:ring-2 ring-blue-500 outline-none transition-all text-lg"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 h-[60px] px-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                        <input
                            type="checkbox"
                            id="deepScan"
                            checked={deepScan}
                            onChange={(e) => setDeepScan(e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="deepScan" className="font-medium cursor-pointer select-none">
                            Deep Scan <span className="text-xs text-[var(--muted)] block font-normal">Checks Contact Pages</span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !niche || !location}
                        className="h-[60px] px-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-lg shadow-blue-500/25 hover:scale-[1.02] hover:shadow-blue-500/40 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shrink-0"
                    >
                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Maximize2 className="w-6 h-6" />}
                        {isLoading ? 'Hunting...' : 'Start Hunt'}
                    </button>
                </form>
            </div>

            {/* Live Logs Terminal */}
            {(isLoading || logs.length > 0) && (
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-2 px-2">
                        <label className="text-xs font-mono font-bold text-[var(--muted)] flex items-center gap-2">
                            <Terminal className="w-4 h-4" /> LIVE TERMINAL
                        </label>
                        <span className="text-xs font-mono text-blue-500">{progress}% COMPLETE</span>
                    </div>
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black border border-gray-800">
                        {/* Progress Bar Line */}
                        <motion.div
                            className="h-1 bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                        />
                        <div className="h-48 p-6 overflow-y-auto font-mono text-sm text-green-400/90 custom-scrollbar">
                            {logs.map((log, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="mb-1.5 flex items-start gap-2"
                                >
                                    <span className="opacity-50 select-none">{'>'}</span>
                                    {log}
                                </motion.div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="p-6 mb-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-4 text-lg font-medium">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Results Grid - Full Page Flow */}
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                Found Targets
                {leads.length > 0 && <span className="px-3 py-1 rounded-full bg-[var(--secondary)] text-sm font-normal">{leads.length} Leads</span>}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {leads.map((lead, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className={`glass-card flex flex-col p-6 rounded-3xl border border-[var(--border)] relative group hover:shadow-2xl hover:border-blue-500/30 transition-all duration-300 ${lead.isAdded ? 'bg-green-500/5 border-green-500/30' : ''}`}
                    >
                        {/* Score Tag */}
                        <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${lead.score > 75 ? 'bg-green-500 text-white shadow-green-500/20' :
                            lead.score > 50 ? 'bg-yellow-500 text-white shadow-yellow-500/20' :
                                'bg-gray-500 text-white'
                            }`}>
                            {lead.score}% Match
                        </div>

                        <div className="mb-4 pr-12">
                            <h3 className="font-bold text-xl mb-1 line-clamp-1 group-hover:text-blue-500 transition-colors" title={lead.title}>
                                {lead.title}
                            </h3>
                            <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--muted)] hover:text-blue-500 flex items-center gap-1 transition-colors truncate">
                                <ExternalLink className="w-3 h-3" /> {new URL(lead.url).hostname}
                            </a>
                        </div>

                        <p className="text-sm text-[var(--muted)] line-clamp-3 mb-6 bg-[var(--secondary)]/50 p-3 rounded-xl min-h-[5rem]">
                            {lead.description || 'No description found via search.'}
                        </p>

                        <div className="space-y-3 mb-6 flex-1">
                            <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${lead.email ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-[var(--secondary)] text-[var(--muted)]'}`}>
                                <Mail className="w-4 h-4 shrink-0" />
                                <span className={`text-sm font-medium truncate ${!lead.email && 'italic'}`}>
                                    {lead.email || 'No Email Found'}
                                </span>
                            </div>
                            <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${lead.phone ? 'bg-purple-50 text-purple-600 border border-purple-200' : 'bg-[var(--secondary)] text-[var(--muted)]'}`}>
                                <Phone className="w-4 h-4 shrink-0" />
                                <span className={`text-sm font-medium truncate ${!lead.phone && 'italic'}`}>
                                    {lead.phone || 'No Phone Found'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => !lead.isAdded && addToCRM(lead, i)}
                            disabled={lead.isAdded}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-95 ${lead.isAdded
                                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                : 'bg-[var(--foreground)] text-[var(--background)] hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-500/20'
                                }`}
                        >
                            {lead.isAdded ? (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Captured
                                </>
                            ) : (
                                <>
                                    <Plus className="w-5 h-5" />
                                    Add to Pipeline
                                </>
                            )}
                        </button>
                    </motion.div>
                ))}

                {leads.length === 0 && !isLoading && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-[var(--muted)] opacity-30">
                        <Globe className="w-32 h-32 mb-6" />
                        <p className="text-2xl font-bold">Ready to Hunt</p>
                        <p className="text-lg">System standing by for targets.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
