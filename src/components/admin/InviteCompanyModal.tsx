'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Building, User, Loader2, Check, Copy } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function InviteCompanyModal({ isOpen, onClose, onSuccess }: Props) {
    const [companyName, setCompanyName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [personalMessage, setPersonalMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch('/api/admin/companies/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyName, ownerName, ownerEmail, personalMessage })
            });
            const data = await res.json();

            if (data.success) {
                setInviteLink(data.link);
                onSuccess();
            } else {
                alert(data.error || 'Failed to send invitation');
            }
        } catch (error) {
            console.error('Failed to invite:', error);
            alert('Failed to send invitation');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const reset = () => {
        setCompanyName('');
        setOwnerName('');
        setOwnerEmail('');
        setPersonalMessage('');
        setInviteLink('');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={reset}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
                    >
                        <div className="glass-card p-6 m-4 relative">
                            <button
                                onClick={reset}
                                className="absolute right-4 top-4 p-2 hover:bg-[var(--secondary)] rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-[var(--primary)] text-white">
                                    <Building className="w-5 h-5" />
                                </div>
                                Invite Company
                            </h2>

                            {!inviteLink ? (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Company Name</label>
                                        <div className="relative">
                                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                                            <input
                                                type="text"
                                                required
                                                value={companyName}
                                                onChange={(e) => setCompanyName(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                                placeholder="Acme Corp"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Owner Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                                            <input
                                                type="text"
                                                required
                                                value={ownerName}
                                                onChange={(e) => setOwnerName(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                                placeholder="Jane Doe"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Owner Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                                            <input
                                                type="email"
                                                required
                                                value={ownerEmail}
                                                onChange={(e) => setOwnerEmail(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                                placeholder="jane@acme.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-sm font-medium">Personal Message (Optional)</label>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const btn = document.getElementById('ai-invite-btn');
                                                    if (btn) {
                                                        btn.innerHTML = '<span class="animate-spin">✨</span> Writing...';
                                                        (btn as HTMLButtonElement).disabled = true;
                                                    }
                                                    try {
                                                        const res = await fetch('/api/ai/generate-email', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                prompt: `Welcome ${companyName || 'the company'} to Levitate Labs`,
                                                                type: 'standard',
                                                                recipientName: ownerName
                                                            })
                                                        });
                                                        const data = await res.json();
                                                        if (data.content) setPersonalMessage(data.content);
                                                    } catch (err) {
                                                        alert('AI generation failed');
                                                    } finally {
                                                        if (btn) {
                                                            btn.innerHTML = '✨ Write with AI';
                                                            (btn as HTMLButtonElement).disabled = false;
                                                        }
                                                    }
                                                }}
                                                id="ai-invite-btn"
                                                className="text-xs flex items-center gap-1 text-purple-500 hover:text-purple-600 font-medium px-2 py-1 rounded-md hover:bg-purple-50 transition-colors"
                                            >
                                                ✨ Write with AI
                                            </button>
                                        </div>
                                        <textarea
                                            rows={3}
                                            value={personalMessage}
                                            onChange={(e) => setPersonalMessage(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none"
                                            placeholder="We're excited to have you on board..."
                                        />
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={reset}
                                            className="flex-1 py-2 rounded-lg font-medium bg-[var(--secondary)] hover:bg-[var(--border)] transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="flex-1 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Invite'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-green-500/10 rounded-lg text-green-500 text-center">
                                        <Check className="w-8 h-8 mx-auto mb-2" />
                                        <p className="font-medium">Company Invited!</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-[var(--muted)]">Share this link</label>
                                        <div className="flex gap-2">
                                            <input
                                                readOnly
                                                value={inviteLink}
                                                className="flex-1 px-3 py-2 bg-[var(--background)] rounded-lg text-sm border border-[var(--border)]"
                                            />
                                            <button
                                                onClick={copyToClipboard}
                                                className="p-2 bg-[var(--secondary)] hover:bg-[var(--border)] rounded-lg transition-colors"
                                            >
                                                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={reset}
                                        className="w-full py-2 bg-[var(--secondary)] hover:bg-[var(--border)] rounded-lg font-medium transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
