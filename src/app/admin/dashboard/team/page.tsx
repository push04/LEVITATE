'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Search, MoreVertical, Mail, Shield, Building, Pencil, Trash2, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import InviteMemberModal from '@/components/admin/InviteMemberModal';
import InviteCompanyModal from '@/components/admin/InviteCompanyModal';
import EditMemberModal from '@/components/admin/EditMemberModal';
import EmailUserModal from '@/components/admin/EmailUserModal';


// Types
interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string;
    status: string;
    departments?: {
        name: string;
    };
    created_at: string;
}

interface Invitation {
    id: string;
    name: string | null;
    email: string;
    role: string;
    status: string;
    departments?: {
        name: string;
    };
    companies?: {
        name: string;
    };
    created_at: string;
}

export default function TeamPage() {
    const [members, setMembers] = useState<Profile[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Profiles (Employees) - Filter out deleted/suspended if desired, or show them with status
            // We'll show all, but visually distinguish based on status
            const { data: profiles } = await supabase
                .from('profiles')
                .select('*, departments(name)')
                .order('created_at', { ascending: false });

            if (profiles) setMembers(profiles);

            // Fetch Pending Invitations
            const { data: invites } = await supabase
                .from('invitations')
                .select('*, departments(name), companies(name)')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (invites) setInvitations(invites);
        } catch (error) {
            console.error('Error fetching team:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditMember = (member: Profile) => {
        setSelectedMember(member);
        setShowEditModal(true);
    };

    const handleEmailMember = (member: Profile) => {
        setSelectedMember(member);
        setShowEmailModal(true);
    };

    const handleDeleteMember = async (memberId: string) => {
        if (!confirm('Are you sure you want to remove this user? This action cannot be undone.')) return;

        try {
            const res = await fetch('/api/admin/team/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: memberId })
            });

            if (res.ok) {
                // Optimistic update
                setMembers(members.map(m => m.id === memberId ? { ...m, status: 'suspended' } : m));
                alert('User has been deactivated.');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete user');
        }
    };

    const filteredMembers = members.filter(m =>
        m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Team Management</h1>
                    <p className="text-[var(--muted)]">Manage employees, roles, and invitations</p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-xl shadow-lg shadow-[var(--primary)]/20"
                >
                    <UserPlus className="w-5 h-5" />
                    Invite Member
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCompanyModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--secondary)] text-[var(--foreground)] rounded-xl border border-[var(--border)] hover:bg-[var(--border)]"
                >
                    <Building className="w-5 h-5" />
                    Invite Company
                </motion.button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[var(--muted)] text-sm">Total Members</p>
                        <h3 className="text-2xl font-bold">{members.length}</h3>
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[var(--muted)] text-sm">Admins</p>
                        <h3 className="text-2xl font-bold">{members.filter(m => ['admin', 'super_admin'].includes(m.role)).length}</h3>
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-xl">
                        <Mail className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[var(--muted)] text-sm">Pending Invites</p>
                        <h3 className="text-2xl font-bold">{invitations.length}</h3>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                />
            </div>

            {/* Team List */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[var(--secondary)] border-b border-[var(--border)]">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase">Member</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase">Department</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--muted)] uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {/* Pending Invites (First) */}
                            {invitations.map((invite) => (
                                <tr key={invite.id} className="group hover:bg-[var(--secondary)]/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3 opacity-70">
                                            <div className="w-10 h-10 rounded-full bg-[var(--border)] flex items-center justify-center">
                                                <Mail className="w-5 h-5 text-[var(--muted)]" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{invite.name || invite.email}</p>
                                                <p className="text-xs text-[var(--muted)]">{invite.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--border)] text-[var(--muted)] capitalize">
                                            {invite.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[var(--muted)]">
                                        {invite.companies?.name ? (
                                            <span className="flex items-center gap-1 text-[var(--foreground)]">
                                                <Building className="w-3 h-3" /> {invite.companies.name}
                                            </span>
                                        ) : (
                                            invite.departments?.name || '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500">
                                            Pending
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="text-[var(--primary)] text-sm hover:underline">Resend</button>
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('Are you sure you want to revoke this invitation?')) return;
                                                    const { error } = await supabase.from('invitations').delete().eq('id', invite.id);
                                                    if (error) alert(error.message);
                                                    else fetchData();
                                                }}
                                                className="p-1.5 text-[var(--muted)] hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                                                title="Revoke Invitation"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {/* Active Members */}
                            {filteredMembers.map((member) => (
                                <tr key={member.id} className={`group hover:bg-[var(--secondary)]/50 transition-colors ${member.status === 'suspended' ? 'opacity-50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                                                {member.full_name?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-[var(--foreground)]">{member.full_name || 'Unknown'}</p>
                                                <p className="text-xs text-[var(--muted)]">{member.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize 
                                            ${member.role === 'super_admin' ? 'bg-purple-500/10 text-purple-500' :
                                                member.role === 'admin' ? 'bg-blue-500/10 text-blue-500' :
                                                    'bg-[var(--secondary)] text-[var(--muted)]'}`}>
                                            {member.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[var(--muted)]">
                                        <div className="flex items-center gap-2">
                                            <Building className="w-4 h-4" />
                                            {member.departments?.name || 'General'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.status === 'suspended'
                                            ? 'bg-red-500/10 text-red-500'
                                            : 'bg-green-500/10 text-green-500'
                                            }`}>
                                            {member.status === 'suspended' ? 'Inactive' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEmailMember(member)}
                                                className="p-2 text-[var(--muted)] hover:text-blue-500 rounded-lg hover:bg-blue-500/10 transition-colors"
                                                title="Send Email"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEditMember(member)}
                                                className="p-2 text-[var(--muted)] hover:text-[var(--primary)] rounded-lg hover:bg-[var(--secondary)] transition-colors"
                                                title="Edit Member"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteMember(member.id)}
                                                className="p-2 text-[var(--muted)] hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                                                title="Delete Member"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <InviteMemberModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onSuccess={() => {
                    setShowInviteModal(false);
                    fetchData();
                }}
            />

            <InviteCompanyModal
                isOpen={showCompanyModal}
                onClose={() => setShowCompanyModal(false)}
                onSuccess={() => {
                    setShowCompanyModal(false);
                    fetchData();
                }}
            />

            <EditMemberModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                member={selectedMember}
                onSuccess={() => {
                    setShowEditModal(false);
                    fetchData();
                }}
            />

            <EmailUserModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                user={selectedMember}
            />
        </div>
    );
}
