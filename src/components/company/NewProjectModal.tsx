'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Briefcase, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function NewProjectModal({ isOpen, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        due_date: '',
        budget_estimate: '' // Stored in description or separate field if exists, using logic below
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            console.log('Current User:', user);

            if (!user) throw new Error('User not authenticated');

            // Get Company ID
            const { data: company, error: companyError } = await supabase
                .from('companies')
                .select('id')
                .eq('owner_id', user.id)
                .maybeSingle();

            console.log('Company Fetch:', { company, error: companyError });

            if (companyError) throw companyError;

            if (!company) {
                throw new Error('No company profile found for your account. Please contact support or Create a Company Profile first.');
            }

            const payload = {
                company_id: company.id,
                title: formData.title,
                description: `${formData.description}\n\nBudget Estimate: ${formData.budget_estimate}`,
                due_date: formData.due_date || null,
                status: 'new',
                priority: 'medium',
                created_by: user.id
            };

            console.log('Project Payload:', payload);

            const { error, data } = await supabase.from('projects').insert(payload).select();

            console.log('Insert Result:', { data, error });

            if (error) throw error;

            onSuccess();
        } catch (error: any) {
            console.error('FULL ERROR DETAILS:', error);
            alert(`Failed to post project: ${error.message || JSON.stringify(error)}`);
        } finally {
            setLoading(false);
        }
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
                        <div className="glass-card p-6 relative">
                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 p-2 hover:bg-[var(--secondary)] rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-indigo-500 text-white">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                Post New Project
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Project Title</label>
                                    <input
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. Mobile App Development"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Project Requirements</label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                        placeholder="Describe what you need..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Desired Due Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                                            <input
                                                type="date"
                                                value={formData.due_date}
                                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                                className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Budget Estimate</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                                            <input
                                                type="text"
                                                value={formData.budget_estimate}
                                                onChange={e => setFormData({ ...formData, budget_estimate: e.target.value })}
                                                className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 py-2.5 rounded-xl font-medium bg-[var(--secondary)] hover:bg-[var(--border)] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-2.5 rounded-xl font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
