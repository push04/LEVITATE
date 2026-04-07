
import { useState } from 'react';
import { X, Mail, Phone, Sparkles, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OutreachModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: any;
}

export default function OutreachModal({ isOpen, onClose, lead }: OutreachModalProps) {
    const [activeTab, setActiveTab] = useState<'email' | 'call'>('email');
    const [generatedContent, setGeneratedContent] = useState<{ subject?: string, content: string } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGeneratedContent(null);
        try {
            const res = await fetch('/api/admin/outreach/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead, type: activeTab })
            });
            const data = await res.json();
            if (data.success) {
                setGeneratedContent(data.data);
            } else {
                alert('Generation failed:' + data.error);
            }
        } catch (e) {
            console.error(e);
            alert('Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = () => {
        if (!generatedContent) return;
        const textToCopy = activeTab === 'email'
            ? `Subject: ${generatedContent.subject}\n\n${generatedContent.content}`
            : generatedContent.content;

        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen || !lead) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.95 }}
                    className="bg-[var(--background)] border border-[var(--border)] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">AI Outreach Generator</h2>
                                <p className="text-sm text-[var(--muted)]">Drafting for {lead.business_name}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-[var(--secondary)] rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-[var(--border)]">
                        <button
                            onClick={() => { setActiveTab('email'); setGeneratedContent(null); }}
                            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'email' ? 'bg-[var(--secondary)] text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'hover:bg-[var(--secondary)]/50'}`}
                        >
                            <Mail className="w-4 h-4" /> Cold Email
                        </button>
                        <button
                            onClick={() => { setActiveTab('call'); setGeneratedContent(null); }}
                            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'call' ? 'bg-[var(--secondary)] text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'hover:bg-[var(--secondary)]/50'}`}
                        >
                            <Phone className="w-4 h-4" /> Phone Script
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {!generatedContent ? (
                            <div className="text-center py-10">
                                <p className="text-[var(--muted)] mb-6">
                                    Generate a hyper-personalized {activeTab === 'email' ? 'email' : 'script'} based on this lead's tech stack ({lead.tech_stack || 'Unknown'}) and website status.
                                </p>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
                                >
                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {isGenerating ? 'Drafting...' : 'Generate with AI'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activeTab === 'email' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Subject</label>
                                        <div className="p-3 bg-[var(--secondary)]/30 rounded border border-[var(--border)] font-medium">
                                            {generatedContent.subject}
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Content</label>
                                    <div className="p-4 bg-[var(--secondary)]/30 rounded border border-[var(--border)] whitespace-pre-wrap text-sm leading-relaxed">
                                        {generatedContent.content}
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={copyToClipboard}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors text-sm font-medium"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function Loader2({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
}
