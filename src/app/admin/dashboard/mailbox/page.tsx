'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, RefreshCw, Search, Star, Trash2, Archive,
    MoreVertical, CornerUpLeft, Paperclip, Send, User, Plus, X, Loader2
} from 'lucide-react';

interface Thread {
    id: string;
    subject: string;
    snippet: string;
    last_message_at: string;
    status: string;
    category: string;
    contacts?: {
        full_name: string;
        email: string;
        ai_score: number;
    };
}

interface Message {
    id: string;
    from_name: string;
    from_email: string;
    to_email: string[];
    subject: string;
    body_html: string;
    body_text: string;
    created_at: string;
    direction: 'inbound' | 'outbound';
}

export default function MailboxPage() {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);

    const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchThreads();
    }, []);

    useEffect(() => {
        if (selectedThread) {
            fetchMessages(selectedThread.id);
        }
    }, [selectedThread]);

    const fetchThreads = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('email_threads')
            .select('*, contacts(full_name, email, ai_score)')
            .order('last_message_at', { ascending: false });

        if (data) setThreads(data as any);
        setIsLoading(false);
    };

    const fetchMessages = async (threadId: string) => {
        const { data } = await supabase
            .from('email_messages')
            .select('*')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true });

        if (data) setMessages(data as any);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch('/api/admin/mailbox/sync', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                fetchThreads(); // Refresh list
            }
        } catch (error) {
            console.error('Sync failed', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const [fromAddress, setFromAddress] = useState('admin@levitatelabs.online');

    const departments = [
        { name: 'Admin', email: 'admin@levitatelabs.online' },
        { name: 'Sales Team', email: 'sales@levitatelabs.online' },
        { name: 'Tech Team', email: 'tech@levitatelabs.online' },
        { name: 'Design Team', email: 'design@levitatelabs.online' },
        { name: 'HR', email: 'hr@levitatelabs.online' },
        { name: 'Support', email: 'support@levitatelabs.online' },
        { name: 'Marketing', email: 'marketing@levitatelabs.online' },
        { name: 'Info', email: 'info@levitatelabs.online' }
    ];

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedThread) return;
        setIsSending(true);

        try {
            // Find the last message ID to reply to
            const lastMsg = messages[messages.length - 1];
            const senderProfile = departments.find(d => d.email === fromAddress);

            const res = await fetch('/api/admin/mailbox/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    threadId: selectedThread.id,
                    to: selectedThread.contacts?.email,
                    subject: `Re: ${selectedThread.subject}`,
                    body: replyText,
                    replyToMessageId: lastMsg?.id,
                    fromEmail: fromAddress,
                    fromName: senderProfile?.name || 'Levitate Labs'
                })
            });

            if (res.ok) {
                setReplyText('');
                fetchMessages(selectedThread.id); // Refresh messages
            } else {
                alert('Failed to send email');
            }
        } catch (error) {
            console.error('Send error', error);
        } finally {
            setIsSending(false);
        }
    };

    const toggleSelectThread = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelected = new Set(selectedThreads);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedThreads(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedThreads.size === threads.length) {
            setSelectedThreads(new Set());
        } else {
            setSelectedThreads(new Set(threads.map(t => t.id)));
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete selected items?')) return;
        setIsDeleting(true);

        try {
            const res = await fetch('/api/admin/mailbox/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threadIds: Array.from(selectedThreads) })
            });

            if (res.ok) {
                // Remove from local state
                setThreads(threads.filter(t => !selectedThreads.has(t.id)));
                if (selectedThread && selectedThreads.has(selectedThread.id)) {
                    setSelectedThread(null);
                }
                setSelectedThreads(new Set());
            } else {
                alert('Failed to delete');
            }
        } catch (error) {
            console.error('Delete error', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const [isComposing, setIsComposing] = useState(false);
    const [composeTo, setComposeTo] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');

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
                    fromName: departments.find(d => d.email === fromAddress)?.name || 'Levitate Labs'
                })
            });

            const data = await res.json();

            if (res.ok) {
                alert('Email sent successfully');
                setIsComposing(false);
                setComposeTo('');
                setComposeSubject('');
                setComposeBody('');
                fetchThreads(); // Refresh list to show new thread
            } else {
                alert(data.error || 'Failed to send email');
            }
        } catch (error) {
            console.error('Send error', error);
            alert('Failed to send email');
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
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
                                >
                                    {departments.map(dept => (
                                        <option key={dept.email} value={dept.email}>
                                            {dept.name} ({dept.email})
                                        </option>
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
                            <button
                                onClick={() => setIsComposing(false)}
                                disabled={isSending}
                                className="px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendNewEmail}
                                disabled={isSending || !composeTo || !composeSubject || !composeBody}
                                className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Send Email
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Thread List */}
            <div className="w-1/3 glass-card flex flex-col overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={threads.length > 0 && selectedThreads.size === threads.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <h2 className="font-bold text-lg flex items-center gap-2">
                            <Mail className="w-5 h-5" /> Inbox
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsComposing(true)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Compose</span>
                        </button>
                        {selectedThreads.size > 0 && (
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Selected"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className={`p-2 rounded-lg hover:bg-[var(--secondary)] transition-colors ${isSyncing ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {threads.map(thread => (
                        <div
                            key={thread.id}
                            onClick={() => setSelectedThread(thread)}
                            className={`p-4 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--secondary)]/50 transition-colors relative group ${selectedThread?.id === thread.id ? 'bg-[var(--secondary)] border-l-4 border-l-[var(--primary)]' : ''}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={selectedThreads.has(thread.id)}
                                        onChange={(e) => toggleSelectThread(thread.id, e as any)}
                                        className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity checked:opacity-100"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between mb-1">
                                        <span className={`font-medium truncate ${thread.status === 'unread' ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}>
                                            {thread.contacts?.full_name || thread.contacts?.email || 'Unknown'}
                                        </span>
                                        <span className="text-xs text-[var(--muted)] whitespace-nowrap ml-2">
                                            {new Date(thread.last_message_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-medium mb-1 truncate">{thread.subject}</h3>
                                    <p className="text-xs text-[var(--muted)] line-clamp-2">{thread.snippet}</p>

                                    {thread.category === 'lead' && (
                                        <span className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-500 uppercase tracking-wider">
                                            Lead {thread.contacts?.ai_score ? `(${thread.contacts.ai_score})` : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {threads.length === 0 && !isLoading && (
                        <div className="p-8 text-center text-[var(--muted)]">
                            No emails found. Click refresh to sync.
                        </div>
                    )}
                </div>
            </div>

            {/* Message View */}
            <div className="flex-1 glass-card flex flex-col overflow-hidden">
                {selectedThread ? (
                    <>
                        <div className="p-6 border-b border-[var(--border)]">
                            <h2 className="text-xl font-bold mb-2">{selectedThread.subject}</h2>
                            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                                <User className="w-4 h-4" />
                                <span>{selectedThread.contacts?.full_name} &lt;{selectedThread.contacts?.email}&gt;</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-xl p-4 ${msg.direction === 'outbound'
                                        ? 'bg-[var(--primary)] text-white'
                                        : 'bg-[var(--secondary)] text-[var(--foreground)]'
                                        }`}>
                                        <div className="flex justify-between items-center mb-2 opacity-70 text-xs">
                                            <span>{msg.from_name}</span>
                                            <span>{new Date(msg.created_at).toLocaleString()}</span>
                                        </div>
                                        {/* Dangerously Set HTML if html exists, else text */}
                                        {msg.body_html ? (
                                            <div
                                                className="prose prose-sm dark:prose-invert max-w-none"
                                                dangerouslySetInnerHTML={{ __html: msg.body_html }}
                                            />
                                        ) : (
                                            <p className="whitespace-pre-wrap">{msg.body_text}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)]">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm text-[var(--muted)]">From:</span>
                                <select
                                    value={fromAddress}
                                    onChange={(e) => setFromAddress(e.target.value)}
                                    className="bg-[var(--background)] border border-[var(--border)] text-sm rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                >
                                    {departments.map(dept => (
                                        <option key={dept.email} value={dept.email}>
                                            {dept.name} ({dept.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder={`Reply as ${departments.find(d => d.email === fromAddress)?.name}...`}
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
                        Select an email to view
                    </div>
                )}
            </div>
        </div>
    );
}
