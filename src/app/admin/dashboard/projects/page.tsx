'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Calendar, User, ArrowRight, LayoutGrid, List as ListIcon, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import CreateProjectModal from '@/components/admin/CreateProjectModal';
import AssignProjectModal from '@/components/admin/AssignProjectModal';

interface Project {
    id: string;
    title: string;
    description: string | null;
    status: string;
    client_name: string | null;
    due_date: string | null;
    created_at: string;
    updated_at: string;
    assigned_to: string | null;
    profiles?: {
        full_name: string | null;
        avatar_url: string | null;
    };
    departments?: {
        name: string;
    };
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedProjectForAssignment, setSelectedProjectForAssignment] = useState<Project | null>(null);

    const fetchProjects = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('projects')
            .select('*, profiles:assigned_to(full_name, avatar_url), departments(name)')
            .order('updated_at', { ascending: false });

        if (!error && data) {
            setProjects(data as unknown as Project[]);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const filteredProjects = projects.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.client_name && p.client_name.toLowerCase().includes(search.toLowerCase()))
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'in_progress': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'review': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
            default: return 'bg-[var(--secondary)] text-[var(--muted)] border-[var(--border)]';
        }
    };

    const deleteProject = async (e: React.MouseEvent, projectId: string) => {
        e.preventDefault(); // Prevent navigation
        e.stopPropagation();

        if (!confirm('Are you sure you want to delete this project? This will delete all associated tasks as well.')) return;

        // Optimistic update
        setProjects(prev => prev.filter(p => p.id !== projectId));

        const { error } = await supabase.from('projects').delete().eq('id', projectId);

        if (error) {
            console.error('Error deleting project:', error);
            alert('Failed to delete project: ' + error.message);
            fetchProjects(); // Revert on error
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Projects</h1>
                    <p className="text-[var(--muted)]">Track and manage client projects</p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-xl shadow-lg shadow-[var(--primary)]/20"
                >
                    <Plus className="w-5 h-5" />
                    New Project
                </motion.button>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                </div>
                <div className="flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] shrink-0">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[var(--secondary)] text-[var(--foreground)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[var(--secondary)] text-[var(--foreground)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                    >
                        <ListIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project, index) => (
                        <Link href={`/admin/dashboard/projects/${project.id}`} key={project.id}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className="glass-card p-5 flex flex-col justify-between h-full cursor-pointer hover:shadow-lg transition-all border border-[var(--border)] hover:border-[var(--primary)]/30 group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border ${getStatusColor(project.status)} uppercase`}>
                                        {project.status.replace('_', ' ')}
                                    </span>

                                    {/* Action Buttons - aligned top right, not absolute */}
                                    <div className="flex gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSelectedProjectForAssignment(project);
                                            }}
                                            className="p-1.5 bg-[var(--primary)] text-white rounded-lg shadow-md hover:bg-blue-600 transition-colors"
                                            title="Assign Project"
                                        >
                                            <User className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => deleteProject(e, project.id)}
                                            className="p-1.5 bg-[var(--surface)] text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-[var(--border)]"
                                            title="Delete Project"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-lg font-bold mb-2 text-[var(--foreground)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
                                        {project.title}
                                    </h3>
                                    <p className="text-[var(--muted)] text-sm line-clamp-2 h-10 leading-relaxed">
                                        {project.description || 'No description provided.'}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)] border-dashed">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-[var(--secondary)] flex items-center justify-center text-[10px] font-bold overflow-hidden border border-[var(--border)]">
                                            {project.profiles?.avatar_url ? (
                                                <img src={project.profiles.avatar_url} alt="Lead" className="w-full h-full object-cover" />
                                            ) : (
                                                project.profiles?.full_name?.[0] || '?'
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-semibold">{project.profiles?.full_name?.split(' ')[0] || 'Unassigned'}</span>
                                            <span className="text-[9px] text-[var(--muted)] uppercase tracking-wide">Lead</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-[var(--muted)] uppercase tracking-wide flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> Due Date
                                        </span>
                                        <span className={`text-xs font-medium ${project.due_date && new Date(project.due_date) < new Date() ? 'text-red-500' : 'text-[var(--foreground)]'}`}>
                                            {project.due_date ? new Date(project.due_date).toLocaleDateString() : 'No Deadline'}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--secondary)] border-b border-[var(--border)]">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase whitespace-nowrap">Project</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase whitespace-nowrap">Client</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase whitespace-nowrap">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase whitespace-nowrap">Lead</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase whitespace-nowrap">Deadline</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {filteredProjects.map((project) => (
                                    <tr key={project.id} className="hover:bg-[var(--secondary)]/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="font-medium text-[var(--foreground)]">{project.title}</p>
                                        </td>
                                        <td className="px-6 py-4 text-[var(--muted)] whitespace-nowrap">{project.client_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(project.status)} uppercase`}>
                                                {project.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap">{project.profiles?.full_name || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-[var(--muted)] whitespace-nowrap">
                                            {project.due_date ? new Date(project.due_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2 whitespace-nowrap">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedProjectForAssignment(project);
                                                }}
                                                className="p-2 text-[var(--muted)] hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                title="Assign Project"
                                            >
                                                <User className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => deleteProject(e, project.id)}
                                                className="p-2 text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete Project"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <CreateProjectModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    setShowCreateModal(false);
                    fetchProjects();
                }}
            />

            {selectedProjectForAssignment && (
                <AssignProjectModal
                    isOpen={!!selectedProjectForAssignment}
                    onClose={() => setSelectedProjectForAssignment(null)}
                    onSuccess={() => {
                        setSelectedProjectForAssignment(null);
                        fetchProjects();
                    }}
                    projectId={selectedProjectForAssignment.id}
                    projectTitle={selectedProjectForAssignment.title}
                />
            )}
        </div>
    );
}
