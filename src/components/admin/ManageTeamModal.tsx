'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Trash2, UserCog, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectTitle: string;
}

export default function ManageTeamModal({ isOpen, onClose, projectId, projectTitle }: Props) {
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchMembers();
        }
    }, [isOpen]);

    const fetchMembers = async () => {
        setLoading(true);
        // Fetch assigned users from join table
        const { data: assignments, error } = await supabase
            .from('project_assignments')
            .select('id, user_id, role, profiles:user_id(full_name, email, avatar_url, role)')
            .eq('project_id', projectId);

        if (assignments) {
            setMembers(assignments);
        }
        setLoading(false);
    };

    const removeMember = async (assignmentId: string, memberName: string) => {
        if (!confirm(`Are you sure you want to remove ${memberName} from this project?`)) return;

        try {
            const { error } = await supabase
                .from('project_assignments')
                .delete()
                .eq('id', assignmentId);

            if (error) throw error;

            setMembers(prev => prev.filter(m => m.id !== assignmentId));
        } catch (error) {
            console.error('Error removing member:', error);
            alert('Failed to remove member.');
        }
    };

    const updateRole = async (assignmentId: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from('project_assignments')
                .update({ role: newRole })
                .eq('id', assignmentId);

            if (error) throw error;

            setMembers(prev => prev.map(m => m.id === assignmentId ? { ...m, role: newRole } : m));
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Failed to update role.');
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
                        <div className="glass-card p-6 relative max-h-[80vh] flex flex-col">
                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 p-2 hover:bg-[var(--secondary)] rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-[var(--primary)] text-white">
                                    <UserCog className="w-5 h-5" />
                                </div>
                                Manage Team
                            </h2>
                            <p className="text-[var(--muted)] text-sm mb-6">
                                Managing members for <span className="font-medium text-[var(--foreground)]">{projectTitle}</span>.
                            </p>

                            <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 -mr-2">
                                {loading ? (
                                    <div className="py-8 flex justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-[var(--muted)]" />
                                    </div>
                                ) : members.length === 0 ? (
                                    <div className="text-center py-8 text-[var(--muted)]">
                                        No members assigned yet.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {members.map((member) => (
                                            <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--secondary)]/50 border border-[var(--border)]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                        {member.profiles?.avatar_url ? (
                                                            <img src={member.profiles.avatar_url} className="w-full h-full rounded-full object-cover" />
                                                        ) : (
                                                            member.profiles?.full_name?.[0] || 'U'
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{member.profiles?.full_name}</p>
                                                        <p className="text-xs text-[var(--muted)]">{member.profiles?.email}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={member.role}
                                                        onChange={(e) => updateRole(member.id, e.target.value)}
                                                        className="text-xs bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                                    >
                                                        <option value="assignee">Assignee</option>
                                                        <option value="manager">Manager</option>
                                                        <option value="reviewer">Reviewer</option>
                                                    </select>

                                                    <button
                                                        onClick={() => removeMember(member.id, member.profiles?.full_name)}
                                                        className="p-1.5 hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 rounded-lg transition-colors"
                                                        title="Remove Member"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 mt-2 border-t border-[var(--border)] flex justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white hover:bg-blue-600 transition-colors text-sm font-medium"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
