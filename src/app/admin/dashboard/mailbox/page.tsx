'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, RefreshCw, Send, User, Plus, X, Loader2, Bot } from 'lucide-react';

interface AgentEmail {
    id: string;
    lead_id: string | null;
    agent_name: string;
    direction: 'inbound' | 'outbound';
    to_email: string | null;
    from_email: string | null;
    subject: string | null;
    body: string | null;
    status: string;
    created_at: string;
}

function getStatusMeta(status: string) {
    const key = String(status || '').toLowerCase();
    if (key === 'queued') return { label: 'Queued', className: 'bg-slate-500/15 text-slate-300' };
    if (key === 'accepted' || key === 'sent') return { label: 'Sent', className: 'bg-blue-500/15 text-blue-300' };
    if (key === 'opened') return { label: 'Opened', className: 'bg-emerald-500/15 text-emerald-300' };
    if (key === 'replied') return { label: 'Replied', className: 'bg-violet-500/15 text-violet-300' };
    if (key === 'failed') return { label: 'Failed', className: 'bg-red-500/15 text-red-300' };
    if (key === 'received') return { label: 'Incoming', className: 'bg-amber-500/15 text-amber-300' };
    return { label: status || 'Unknown', className: 'bg-slate-500/15 text-slate-300' };
}

export default function MailboxPage() {
    const [rawEmails, setRawEmails] = useState<AgentEmail[]>([]);
    const [selectedContact, setSelectedContact] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isComposing, setIsComposing] = useState(false);
    const [composeTo, setComposeTo] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTab, setFilterTab] = useState<'all' | 'inbound' | 'outbound'>('all');
    const [fromAddress, setFromAddress] = useState('founder@levitatelabs.online');

    const FROM_EMAILS = [
        'founder@levitatelabs.online',
        'support@levitatelabs.online',
        'gurleen@levitatelabs.online',
        'harsh@levitatelabs.online',
        'pushpal@levitatelabs.online'
    ];

    const getSenderName = (email: string) => {
        switch (email) {
            case 'founder@levitatelabs.online': return 'Founder | Levitate Labs';
            case 'support@levitatelabs.online': return 'Support | Levitate Labs';
            case 'gurleen@levitatelabs.online': return 'Gurleen Bhatia';
            case 'harsh@levitatelabs.online': return 'Harsh Srivastava';
            case 'pushpal@levitatelabs.online': return 'Pushpal Sanyal';
            default: return 'Levitate Labs';
        }
    };

    useEffect(() => {
        fetchEmails();
        
        // Realtime Subscription
        const sub = supabase.channel('mailbox_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_emails' }, () => {
                fetchEmails();
            })
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, []);

    const fetchEmails = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/mailbox/emails');
            if (res.ok) {
                const data = await res.json();
                setRawEmails(data);
            }
        } catch (error) {
            console.error('Failed to fetch emails', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Group emails by the external contact's email address
    const threads = useMemo(() => {
        const groups: Record<string, AgentEmail[]> = {};
        rawEmails.forEach(email => {
            // Find the "other party" (the lead/user)
            let contactEmail = '';
            if (email.direction === 'inbound') {
                contactEmail = email.from_email || 'unknown';
            } else {
                contactEmail = email.to_email || 'unknown';
            }
            contactEmail = contactEmail.replace(/.*</, '').replace(/>.*/, '').trim();

            if (!groups[contactEmail]) groups[contactEmail] = [];
            groups[contactEmail].push(email);
        });

        // Convert to array and sort by most recent message
        const threadArr = Object.values(groups).map(group => {
            const sorted = group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return {
                contactEmail: sorted[0].direction === 'inbound' ? sorted[0].from_email : sorted[0].to_email,
                cleanEmail: sorted[0].direction === 'inbound' 
                    ? sorted[0].from_email?.replace(/.*</, '').replace(/>.*/, '') 
                    : sorted[0].to_email?.replace(/.*</, '').replace(/>.*/, ''),
                messages: sorted.reverse(), // ascending order for conversation view
                latest: sorted[0]
            };
        });

        return threadArr.sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime());
    }, [rawEmails]);

    const filteredThreads = useMemo(() => {
        return threads.filter(thread => {
            // Apply text search
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchesSubject = thread.latest.subject?.toLowerCase().includes(q);
                const matchesEmail = thread.cleanEmail?.toLowerCase().includes(q);
                const matchesBody = thread.latest.body?.toLowerCase().includes(q);
                if (!matchesSubject && !matchesEmail && !matchesBody) return false;
            }

            // Apply tabs
            if (filterTab === 'inbound') {
                return thread.latest.direction === 'inbound';
            }
            if (filterTab === 'outbound') {
                return thread.latest.direction === 'outbound';
            }
            return true;
        });
    }, [threads, searchQuery, filterTab]);

    const activeThread = useMemo(() => {
        return threads.find(t => t.cleanEmail === selectedContact);
    }, [threads, selectedContact]);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await fetch('/api/admin/mailbox/sync', { method: 'POST' });
            await fetchEmails();
        } catch (error) {
            console.error('Sync failed', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !activeThread) return;
        setIsSending(true);

        try {
            const originalSubj = activeThread.latest.subject || 'Re: Message';
            const subject = originalSubj.startsWith('Re:') ? originalSubj : `Re: ${originalSubj}`;

            const res = await fetch('/api/admin/mailbox/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: activeThread.cleanEmail,
                    subject,
                    body: replyText,
                    fromEmail: fromAddress,
                    fromName: getSenderName(fromAddress)
                })
            });

            if (res.ok) {
                setReplyText('');
                fetchEmails();
            } else {
                alert('Failed to send email');
            }
        } catch (error) {
            console.error('Send error', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleSendNewEmail = async () => {
        if (!composeTo || !composeSubject || !composeBody) return;
        setIsSending(true);

        try {
            const res = await fetch('/api/admin/mailbox/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: composeTo,
                    subject: composeSubject,
                    body: composeBody,
                    fromEmail: fromAddress,
                    fromName: getSenderName(fromAddress)
                })
            });

            if (res.ok) {
                setIsComposing(false);
                setComposeTo('');
                setComposeSubject('');
                setComposeBody('');
                fetchEmails();
            } else {
                alert('Failed to send email');
            }
        } catch (error) {
            console.error('Send error', error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="h-[calc(100vh-2rem)] flex gap-6 relative">
            {/* Compose Modal */}
            {isComposing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--background)]">
                            <h3 className="font-bold text-lg">New Message</h3>
                            <button onClick={() => setIsComposing(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-[var(--muted)] uppercase">From</label>
                                <select
                                    value={fromAddress}
                                    onChange={(e) => setFromAddress(e.target.value)}
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                >
                                    {FROM_EMAILS.map(email => (
                                        <option key={email} value={email}>{email}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-[var(--muted)] uppercase">To</label>
                                <input
                                    type="email"
                                    value={composeTo}
                                    onChange={(e) => setComposeTo(e.target.value)}
                                    placeholder="recipient@example.com"
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-[var(--muted)] uppercase">Subject</label>
                                <input
                                    type="text"
                                    value={composeSubject}
                                    onChange={(e) => setComposeSubject(e.target.value)}
                                    placeholder="Enter subject..."
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                            <div className="space-y-1 flex-1 flex flex-col">
                                <label className="text-xs font-medium text-[var(--muted)] uppercase">Message</label>
                                <textarea
                                    value={composeBody}
                                    onChange={(e) => setComposeBody(e.target.value)}
                                    placeholder="Write your message here..."
                                    className="w-full flex-1 min-h-[200px] bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-[var(--border)] bg-[var(--background)] flex justify-end gap-3">
                            <button onClick={() => setIsComposing(false)} disabled={isSending} className="px-4 py-2 text-sm font-medium text-[var(--muted)]">Cancel</button>
                            <button onClick={handleSendNewEmail} disabled={isSending} className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Send Email
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar List */}
            <div className={`glass-card flex flex-col overflow-hidden ${activeThread ? 'hidden md:flex md:w-1/3' : 'w-full md:w-1/3'}`}>
                <div className="p-4 border-b border-[var(--border)] flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-lg flex items-center gap-2">
                            <Mail className="w-5 h-5" /> Global Inbox
                        </h2>
                        <div className="flex items-center gap-2">
                            <button onClick={handleSync} disabled={isSyncing} className={`p-2 rounded-lg hover:bg-[var(--secondary)] transition-colors ${isSyncing ? 'animate-spin' : ''}`}>
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            placeholder="Search mail..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                    </div>
                    <div className="flex gap-1 bg-[var(--background)] p-1 rounded-lg">
                        {(['all', 'inbound', 'outbound'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setFilterTab(tab)}
                                className={`flex-1 py-1 text-xs font-medium rounded-md capitalize transition-colors ${filterTab === tab ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                            >
                                {tab === 'inbound' ? 'Incoming' : tab === 'outbound' ? 'Sent' : 'All'}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setIsComposing(true)} className="w-full flex items-center justify-center gap-2 p-2 bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 rounded-lg text-sm font-bold transition-colors">
                        <Plus className="w-4 h-4" /> Compose Message
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredThreads.map(thread => (
                        <div
                            key={thread.cleanEmail}
                            onClick={() => setSelectedContact(thread.cleanEmail ?? null)}
                            className={`p-4 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--secondary)]/50 transition-colors ${selectedContact === thread.cleanEmail ? 'bg-[var(--secondary)] border-l-4 border-l-[var(--primary)]' : ''}`}
                        >
                            <div className="flex justify-between mb-1">
                                <span className={`font-medium truncate ${thread.latest.status === 'received' ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}>
                                    {thread.contactEmail}
                                </span>
                                <span className="text-xs text-[var(--muted)] whitespace-nowrap ml-2">
                                    {new Date(thread.latest.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="text-sm font-medium mb-1 truncate">{thread.latest.subject}</h3>
                            <div className="flex items-center gap-2">
                                {thread.latest.agent_name !== 'human_agent' && thread.latest.agent_name !== 'inbound_bot' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-500 font-bold uppercase tracking-wider">
                                        <Bot className="w-3 h-3"/> {thread.latest.agent_name}
                                    </span>
                                )}
                                <p className="text-xs text-[var(--muted)] line-clamp-1 flex-1">{thread.latest.body}</p>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${getStatusMeta(thread.latest.status).className}`}>
                                    {getStatusMeta(thread.latest.status).label}
                                </span>
                            </div>
                        </div>
                    ))}
                    {filteredThreads.length === 0 && !isLoading && (
                        <div className="p-8 text-center text-[var(--muted)]">No emails match filters.</div>
                    )}
                </div>
            </div>

            {/* Conversation View */}
            <div className={`glass-card flex flex-col overflow-hidden ${activeThread ? 'w-full md:flex-1' : 'hidden md:flex md:flex-1'}`}>
                {activeThread ? (
                    <>
                        <div className="p-4 md:p-6 border-b border-[var(--border)] flex items-center justify-between">
                            <div>
                                <h2 className="text-lg md:text-xl font-bold mb-1">{activeThread.latest.subject}</h2>
                                <div className="flex items-center gap-2 text-xs md:text-sm text-[var(--muted)]">
                                    <User className="w-4 h-4" />
                                    <span>{activeThread.contactEmail}</span>
                                </div>
                            </div>
                            <button className="md:hidden p-2 rounded-lg bg-[var(--secondary)]" onClick={() => setSelectedContact(null)}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {activeThread.messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-xl p-4 ${msg.direction === 'outbound' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--secondary)] text-[var(--foreground)]'}`}>
                                        <div className="flex justify-between items-center mb-2 opacity-70 text-xs gap-4">
                                            <span className="font-semibold flex items-center gap-1">
                                                {msg.agent_name !== 'human_agent' && msg.agent_name !== 'inbound_bot' && <Bot className="w-3 h-3"/>}
                                                {msg.direction === 'outbound' ? msg.agent_name : msg.from_email}
                                            </span>
                                            <span>{new Date(msg.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                                            {msg.body}
                                        </div>
                                        {msg.direction === 'outbound' && (
                                            <div className="mt-2 text-[10px] uppercase tracking-[0.12em]">
                                                {getStatusMeta(msg.status).label}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)]">
                            <div className="mb-3 flex items-center gap-2">
                                <label className="text-xs font-medium text-[var(--muted)] uppercase">Reply As:</label>
                                <select
                                    value={fromAddress}
                                    onChange={(e) => setFromAddress(e.target.value)}
                                    className="bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                >
                                    {FROM_EMAILS.map(email => (
                                        <option key={email} value={email}>{email}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder={`Reply as ${fromAddress}...`}
                                    className="flex-1 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none h-24"
                                />
                                <button
                                    onClick={handleSendReply}
                                    disabled={isSending || !replyText.trim()}
                                    className="px-4 bg-[var(--primary)] text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isSending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
                        Select a conversation to view
                    </div>
                )}
            </div>
        </div>
    );
}
