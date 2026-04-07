'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, AlertCircle, Check } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    user: { id: string; email: string | null; full_name: string | null } | null;
}

export default function EmailUserModal({ isOpen, onClose, user }: Props) {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [template, setTemplate] = useState('standard');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/team/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    subject,
                    message,
                    template
                })
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    reset();
                    onClose();
                }, 2000);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to send email');
            }
        } catch (error) {
            console.error('Email error:', error);
            alert('Failed to send email');
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setSubject('');
        setMessage('');
        setTemplate('standard');
        setSuccess(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
                    >
                        <div className="glass-card p-6 m-4 relative">
                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 p-2 hover:bg-[var(--secondary)] rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h2 className="text-xl font-bold mb-1">Email {user.full_name}</h2>
                            <p className="text-sm text-[var(--muted)] mb-6">Send a notification directly to their inbox</p>

                            {!success ? (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Template</label>
                                        <select
                                            value={template}
                                            onChange={(e) => setTemplate(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                        >
                                            <option value="standard">Standard Message</option>
                                            <option value="announcement">Announcement</option>
                                            <option value="warning">Warning / Action Required</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Subject</label>
                                        <input
                                            required
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                            placeholder="Important update..."
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-sm font-medium">Message</label>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!subject && !message) {
                                                        alert('Please enter a subject or some context first!');
                                                        return;
                                                    }

                                                    const btn = document.getElementById('ai-btn');
                                                    if (btn) {
                                                        btn.innerHTML = '<span class="animate-spin">✨</span> Writing...';
                                                        (btn as HTMLButtonElement).disabled = true;
                                                    }

                                                    try {
                                                        const res = await fetch('/api/ai/generate-email', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                prompt: subject || message,
                                                                type: template,
                                                                recipientName: user.full_name || 'User'
                                                            })
                                                        });
                                                        const data = await res.json();
                                                        if (data.content) setMessage(data.content);
                                                    } catch (err) {
                                                        alert('AI generation failed');
                                                    } finally {
                                                        if (btn) {
                                                            btn.innerHTML = '✨ Write with AI';
                                                            (btn as HTMLButtonElement).disabled = false;
                                                        }
                                                    }
                                                }}
                                                id="ai-btn"
                                                className="text-xs flex items-center gap-1 text-purple-500 hover:text-purple-600 font-medium px-2 py-1 rounded-md hover:bg-purple-50 transition-colors"
                                            >
                                                ✨ Write with AI
                                            </button>
                                        </div>
                                        <textarea
                                            required
                                            rows={8}
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none"
                                            placeholder="Type your message here..."
                                        />
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            Send Email
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-4">
                                        <Check className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold">Email Sent!</h3>
                                    <p className="text-[var(--muted)]">Your message has been delivered to {user.email}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )
            }
        </AnimatePresence >
    );
}
