'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2, Send } from 'lucide-react';

interface Campaign {
    id: string;
    name: string;
}

interface AddToCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    leadData: { name?: string; email?: string; source: string; source_id?: string } | null;
}

export default function AddToCampaignModal({ isOpen, onClose, leadData }: AddToCampaignModalProps) {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState('');
    const [emailOverride, setEmailOverride] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchCampaigns();
            if (leadData?.email) setEmailOverride(leadData.email);
            setSuccess(false);
            setSelectedCampaign('');
        }
    }, [isOpen, leadData]);

    const fetchCampaigns = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/growth/campaigns');
            const data = await res.json();
            if (data.success) setCampaigns(data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedCampaign) return;
        // precise email check or user input
        const finalEmail = emailOverride || (leadData?.email);

        if (!finalEmail) {
            alert("We couldn't detect an email for this lead. Please enter one manually.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/growth/leads/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaign_id: selectedCampaign,
                    email: finalEmail,
                    name: leadData?.name,
                    source: leadData?.source,
                    source_id: leadData?.source_id
                })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                setTimeout(onClose, 1500);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to add lead');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1 hover:bg-[var(--secondary)] rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-bold mb-1">Add to Campaign</h2>
                        <p className="text-sm text-[var(--muted)] mb-6">
                            Push <span className="font-bold text-[var(--foreground)]">{leadData?.name || 'this lead'}</span> into an automated sequence.
                        </p>

                        {!success ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-[var(--muted)] mb-1 block">Select Campaign</label>
                                    <select
                                        value={selectedCampaign}
                                        onChange={(e) => setSelectedCampaign(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    >
                                        <option value="">-- Choose a Campaign --</option>
                                        {campaigns.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-[var(--muted)] mb-1 block">
                                        Email Address {leadData?.email ? '(Detected)' : '(Manual Entry)'}
                                    </label>
                                    <input
                                        type="email"
                                        value={emailOverride}
                                        onChange={(e) => setEmailOverride(e.target.value)}
                                        placeholder="lead@example.com"
                                        className="w-full p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    />
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !selectedCampaign || !emailOverride}
                                        className="px-6 py-2 bg-[var(--primary)] text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Add to Sequence
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold">Lead Added!</h3>
                                <p className="text-[var(--muted)]">Calculated sequence started.</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
