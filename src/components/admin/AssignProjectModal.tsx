'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, UserPlus, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getEmailTemplate } from '@/lib/email-template';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    projectId: string;
    projectTitle: string;
}

export default function AssignProjectModal({ isOpen, onClose, onSuccess, projectId, projectTitle }: Props) {
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [role, setRole] = useState('assignee');

    useEffect(() => {
        if (isOpen) {
            fetchEmployees();
        }
    }, [isOpen]);

    const fetchEmployees = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .in('role', ['employee', 'manager', 'admin', 'super_admin']) // Allow assigning to anyone internal
            .eq('status', 'active');

        if (data) setEmployees(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee) return;
        setLoading(true);

        try {
            // Check if already assigned
            const { data: existing } = await supabase
                .from('project_assignments')
                .select('id')
                .eq('project_id', projectId)
                .eq('user_id', selectedEmployee)
                .single();

            if (existing) {
                alert('User is already assigned to this project.');
                setLoading(false);
                return;
            }

            const { error: assignError } = await supabase
                .from('project_assignments')
                .insert({
                    project_id: projectId,
                    user_id: selectedEmployee,
                    role: role
                });

            if (assignError) throw assignError;

            // Also update the main 'assigned_to' field on the project for backward compatibility/easy grid view
            await supabase
                .from('projects')
                .update({ assigned_to: selectedEmployee })
                .eq('id', projectId);

            // Fetch employee email for notification
            const selectedEmpObj = employees.find(e => e.id === selectedEmployee);
            if (selectedEmpObj?.email) {
                try {
                    await fetch('/api/notifications/email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: selectedEmpObj.email,
                            subject: `New Project Assignment: ${projectTitle}`,
                            html: getEmailTemplate({
                                title: 'New Project Assignment',
                                recipientName: selectedEmpObj.full_name || 'Team Member',
                                message: `You have been assigned to the project <strong>${projectTitle}</strong>.
                                
                                <br/><br/>
                                Please log in to your dashboard to view the project details, tasks, and files.`,
                                ctaText: 'View Project',
                                ctaLink: 'https://levitatelabs.online/admin/dashboard/projects',
                                footerText: 'Best Regards,\nLevitate Labs Team'
                            })
                        })
                    });
                } catch (emailErr) {
                    console.error('Failed to send assignment email:', emailErr);
                    // Don't block success UI if email fails
                }
            }

            onSuccess();
        } catch (error: any) {
            console.error('Error assigning project:', error);
            alert('Failed to assign project. Please try again.');
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
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
                    >
                        <div className="glass-card p-6 relative">
                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 p-2 hover:bg-[var(--secondary)] rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-[var(--primary)] text-white">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                Assign Project
                            </h2>
                            <p className="text-[var(--muted)] text-sm mb-6">
                                Assign <span className="font-medium text-[var(--foreground)]">{projectTitle}</span> to a team member.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Select Member</label>
                                    <select
                                        required
                                        value={selectedEmployee}
                                        onChange={e => setSelectedEmployee(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none appearance-none"
                                    >
                                        <option value="">Choose employee...</option>
                                        {employees.map(e => (
                                            <option key={e.id} value={e.id}>
                                                {e.full_name} ({e.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Role</label>
                                    <select
                                        value={role}
                                        onChange={e => setRole(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none appearance-none"
                                    >
                                        <option value="assignee">Assignee</option>
                                        <option value="manager">Manager</option>
                                        <option value="reviewer">Reviewer</option>
                                    </select>
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
                                        disabled={loading || !selectedEmployee}
                                        className="flex-1 py-2.5 rounded-xl font-medium bg-[var(--primary)] text-white hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                            <>
                                                <Check className="w-4 h-4" /> Assign
                                            </>
                                        )}
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
