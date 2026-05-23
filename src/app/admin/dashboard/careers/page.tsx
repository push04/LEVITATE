'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, X, Eye, FileText, User, Mail, Calendar, Linkedin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DOMPurify from 'isomorphic-dompurify';
import { format } from 'date-fns';

interface Application {
    id: string;
    full_name: string;
    email: string;
    portfolio_link: string;
    department?: string; // Searchable/Filterable track
    interview_transcript: any; // JSON
    ai_summary: string;
    rating: number;
    status: string;
    created_at: string;
}

export default function CareersAdminPage() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('career_applications')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching applications:', error);
        else setApplications(data || []);
        setIsLoading(false);
    };

    const handleAction = async (action: 'approve' | 'reject') => {
        if (!selectedApp) return;
        setIsProcessing(true);

        try {
            if (action === 'approve') {
                // Call API to send email and update status
                const res = await fetch('/api/careers/approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        applicationId: selectedApp.id,
                        department: selectedApp.department // Send selected department
                    }),
                });

                if (!res.ok) throw new Error('Failed to approve');

                alert('Candidate approved and invitation sent!');
            } else {
                // Just update status
                const { error } = await supabase
                    .from('career_applications')
                    .update({ status: 'rejected' })
                    .eq('id', selectedApp.id);

                if (error) throw error;
            }

            // Refresh list
            fetchApplications();
            setSelectedApp(null);
        } catch (error) {
            console.error('Action error:', error);
            alert('Action failed. Check console.');
        } finally {
            setIsProcessing(false);
        }
    };

    const ensureUrl = (url: string) => {
        if (!url) return '#';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `https://${url}`;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Career Applications</h1>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            ) : (
                <div className="grid gap-4">
                    {applications.map((app) => (
                        <motion.div
                            key={app.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-bold text-xl">
                                    {app.full_name[0]}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">{app.full_name}</h3>
                                    <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {app.email}</span>
                                        {app.department && <span className="flex items-center gap-1 px-2 py-0.5 bg-[var(--secondary)] rounded-md text-xs font-bold uppercase tracking-wider">{app.department}</span>}
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(app.created_at), 'MMM d, yyyy')}</span>
                                    </div>
                                    <a
                                        href={ensureUrl(app.portfolio_link)}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()} // Prevent row click
                                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 flex items-center gap-1 font-medium z-10 relative"
                                    >
                                        <Linkedin className="w-3 h-3" /> View LinkedIn
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${app.status === 'new' ? 'bg-blue-500/10 text-blue-500' :
                                    app.status === 'hired' ? 'bg-green-500/10 text-green-500' :
                                        app.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                            'bg-[var(--secondary)] text-[var(--muted)]'
                                    }`}>
                                    {app.status}
                                </span>

                                <button
                                    onClick={() => setSelectedApp(app)}
                                    className="px-4 py-2 bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                >
                                    <Eye className="w-4 h-4" /> Review
                                </button>
                            </div>
                        </motion.div>
                    ))}

                    {applications.length === 0 && (
                        <div className="text-center py-20 text-[var(--muted)]">
                            No applications received yet.
                        </div>
                    )}
                </div>
            )}

            {/* Review Modal */}
            <AnimatePresence>
                {selectedApp && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedApp(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-[var(--surface)] w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
                                <h2 className="text-xl font-bold">Review: {selectedApp.full_name}</h2>
                                <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-[var(--secondary)] rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* AI Summary */}
                                <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-bold text-blue-500 flex items-center gap-2">
                                            <FileText className="w-4 h-4" /> AI Summary (Rating: {selectedApp.rating || 'N/A'})
                                        </h3>
                                        {(!selectedApp.ai_summary || selectedApp.ai_summary === 'AI Summary Pending...') && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    setIsProcessing(true);
                                                    try {
                                                        const res = await fetch('/api/ai/summary', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ transcript: selectedApp.interview_transcript }),
                                                        });
                                                        const data = await res.json();
                                                        if (res.ok && data.summary) {
                                                            // Update DB
                                                            await supabase.from('career_applications')
                                                                .update({ ai_summary: data.summary, rating: data.rating })
                                                                .eq('id', selectedApp.id);

                                                            // Update Local
                                                            setSelectedApp(prev => prev ? ({ ...prev, ai_summary: data.summary, rating: data.rating }) : null);
                                                            setApplications(prev => prev.map(a => a.id === selectedApp.id ? { ...a, ai_summary: data.summary, rating: data.rating } : a));
                                                        } else {
                                                            alert('Error: ' + (data.summary || 'Unknown error'));
                                                        }
                                                    } catch (err: any) {
                                                        console.error(err);
                                                        alert('Failed to generate summary: ' + err.message);
                                                    } finally {
                                                        setIsProcessing(false);
                                                    }
                                                }}
                                                disabled={isProcessing}
                                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                                            >
                                                {isProcessing ? 'Generating...' : 'Generate Now'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                                        {selectedApp.ai_summary ? (
                                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedApp.ai_summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')) }} />
                                        ) : (
                                            <span className="text-[var(--muted)] italic">No summary available. Click generate to analyze.</span>
                                        )}
                                    </div>
                                </div>

                                {/* Transcript */}
                                <div>
                                    <h3 className="font-bold mb-4">Interview Transcript</h3>
                                    <div className="space-y-4">
                                        {Array.isArray(selectedApp.interview_transcript) && selectedApp.interview_transcript.map((msg: any, i: number) => (
                                            msg.role !== 'system' && (
                                                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${msg.role === 'user' ? 'bg-[var(--secondary)]' : 'bg-[var(--primary)]/10 text-[var(--primary)]'}`}>
                                                        {msg.role === 'user' ? 'U' : 'AI'}
                                                    </div>
                                                    <div className={`p-3 rounded-xl max-w-[80%] text-sm ${msg.role === 'user'
                                                        ? 'bg-[var(--secondary)]'
                                                        : 'bg-[var(--surface)] border border-[var(--border)]'
                                                        }`}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-[var(--border)] bg-[var(--background)] flex flex-col gap-4">

                                {/* Department Selection (Only for Approval) */}
                                <div className="flex items-center justify-between bg-[var(--surface)] p-3 rounded-xl border border-[var(--border)]">
                                    <span className="text-sm font-medium">Assign Department:</span>
                                    <select
                                        className="bg-transparent border-none outline-none font-bold text-[var(--primary)] text-right cursor-pointer"
                                        value={selectedApp.department || 'Frontend'}
                                        onChange={(e) => setSelectedApp({ ...selectedApp, department: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option value="Frontend">Frontend</option>
                                        <option value="Backend">Backend</option>
                                        <option value="Fullstack">Fullstack</option>
                                        <option value="Mechanical">Mechanical</option>
                                        <option value="Design">Design</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="Sales">Sales</option>
                                        <option value="Operations">Operations</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="flex justify-end gap-4">
                                    <button
                                        onClick={() => handleAction('reject')}
                                        disabled={isProcessing}
                                        className="px-6 py-2 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-xl font-medium transition-colors"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleAction('approve')}
                                        disabled={isProcessing}
                                        className="px-6 py-2 bg-green-500 text-white hover:bg-green-600 rounded-xl font-bold shadow-lg shadow-green-500/20 flex items-center gap-2 transition-colors"
                                    >
                                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Approve & Hire
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
