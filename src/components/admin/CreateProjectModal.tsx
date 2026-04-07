'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Briefcase, User, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateProjectModal({ isOpen, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        client_name: '',
        client_email: '',
        department_id: '',
        assigned_to: '',
        start_date: '',
        due_date: '',
        priority: 'medium',
        budget: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchMetadata();
        }
    }, [isOpen]);

    const fetchMetadata = async () => {
        const { data: depts } = await supabase.from('departments').select('id, name');
        const { data: users } = await supabase.from('profiles').select('id, full_name').eq('status', 'active');

        if (depts) setDepartments(depts);
        if (users) setEmployees(users);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            // Sanitize payload: valid UUIDs or null, not empty strings
            const payload = {
                ...formData,
                department_id: formData.department_id || null,
                assigned_to: formData.assigned_to || null,
                start_date: formData.start_date || null,
                due_date: formData.due_date || null,
                budget: formData.budget ? parseFloat(formData.budget) : null,
                created_by: session?.user.id
            };

            console.log('Creating project with payload:', payload);

            const { data, error } = await supabase.from('projects').insert(payload).select();

            if (error) {
                console.error('Supabase Insert Error:', error);
                throw error;
            }

            console.log('Project created successfully:', data);
            onSuccess();
        } catch (error: any) {
            console.error('Error creating project:', error);
            // Alert with more details if available
            alert(`Failed to create project: ${error.message || error.details || JSON.stringify(error)}`);
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
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 h-[90vh] overflow-y-auto scrollbar-hide"
                    >
                        <div className="glass-card p-6 relative">
                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 p-2 hover:bg-[var(--secondary)] rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-[var(--primary)]" />
                                New Project
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">Project Title</label>
                                        <input
                                            required
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                            placeholder="e.g. Website Redesign"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">Description</label>
                                        <textarea
                                            rows={3}
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none"
                                            placeholder="Project details..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Client Name</label>
                                        <input
                                            value={formData.client_name}
                                            onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Client Email</label>
                                        <input
                                            type="email"
                                            value={formData.client_email}
                                            onChange={e => setFormData({ ...formData, client_email: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Department</label>
                                        <select
                                            value={formData.department_id}
                                            onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none appearance-none"
                                        >
                                            <option value="" className="bg-[var(--surface)] text-[var(--foreground)]">Select Department</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id} className="bg-[var(--surface)] text-[var(--foreground)]">{d.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Project Lead</label>
                                        <select
                                            value={formData.assigned_to}
                                            onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none appearance-none"
                                        >
                                            <option value="" className="bg-[var(--surface)] text-[var(--foreground)]">Select Lead</option>
                                            {employees.map(e => (
                                                <option key={e.id} value={e.id} className="bg-[var(--surface)] text-[var(--foreground)]">{e.full_name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.start_date}
                                            onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Due Date</label>
                                        <input
                                            type="date"
                                            value={formData.due_date}
                                            onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Priority</label>
                                        <select
                                            value={formData.priority}
                                            onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none appearance-none bg-[var(--surface)] text-[var(--foreground)]"
                                        >
                                            <option value="low" className="bg-[var(--surface)] text-[var(--foreground)]">Low</option>
                                            <option value="medium" className="bg-[var(--surface)] text-[var(--foreground)]">Medium</option>
                                            <option value="high" className="bg-[var(--surface)] text-[var(--foreground)]">High</option>
                                            <option value="urgent" className="bg-[var(--surface)] text-[var(--foreground)]">Urgent</option>
                                        </select>
                                    </div>

                                    <div className="relative">
                                        <label className="block text-sm font-medium mb-1">Budget</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                                            <input
                                                type="number"
                                                value={formData.budget}
                                                onChange={e => setFormData({ ...formData, budget: e.target.value })}
                                                className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 py-2 rounded-lg font-medium bg-[var(--secondary)] hover:bg-[var(--border)] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-2 rounded-lg font-medium bg-[var(--primary)] text-white hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Project'}
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
