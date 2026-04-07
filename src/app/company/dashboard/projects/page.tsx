'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Briefcase, Clock, Calendar, MoreVertical, Edit2, Trash2, ChevronRight } from 'lucide-react';
import NewProjectModal from '@/components/company/NewProjectModal';
import EditProjectModal from '@/components/company/EditProjectModal';
import { supabase } from '@/lib/supabase';

export default function CompanyProjects() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchProjects = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: company } = await supabase
                .from('companies')
                .select('id')
                .eq('owner_id', user.id)
                .maybeSingle();

            if (company) {
                const { data } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('company_id', company.id)
                    .order('created_at', { ascending: false });

                if (data) setProjects(data);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleEditClick = (project: any) => {
        setSelectedProject(project);
        setIsEditOpen(true);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold font-heading bg-gradient-to-r from-[var(--foreground)] to-[var(--muted)] bg-clip-text text-transparent">
                        Projects
                    </h1>
                    <p className="text-[var(--muted)] mt-1">Manage deliverables and track progress</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="btn-primary bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 px-6 py-3 rounded-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    New Project
                </button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 bg-[var(--surface)]/50 backdrop-blur-sm p-2 rounded-2xl border border-[var(--border)] shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                    <input
                        type="text"
                        placeholder="Search projects by name or keywords..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-transparent border-none focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-[var(--muted)]/70"
                    />
                </div>
                <div className="h-full w-px bg-[var(--border)] hidden md:block" />
                <div className="flex items-center gap-2 px-2">
                    <Filter className="w-4 h-4 text-[var(--muted)]" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent border-none py-2 text-sm focus:ring-0 outline-none cursor-pointer font-medium text-[var(--foreground)]"
                    >
                        <option value="all">All Status</option>
                        <option value="new">New</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>

            {/* Projects Grid */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-[var(--muted)]">Loading projects...</p>
                </div>
            ) : filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project, index) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            layoutId={project.id}
                            className="glass-card group relative overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 border border-[var(--border)] hover:border-indigo-500/30"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEditClick(project); }}
                                    className="p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--secondary)] text-[var(--muted)] hover:text-indigo-500 shadow-sm border border-[var(--border)]"
                                    title="Edit Project"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform duration-300">
                                        <Briefcase className="w-6 h-6" />
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${project.status === 'active' ? 'bg-blue-500/10 text-blue-500' :
                                            project.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                                project.status === 'new' ? 'bg-purple-500/10 text-purple-500' :
                                                    'bg-orange-500/10 text-orange-500'
                                        }`}>
                                        {project.status || 'Pending'}
                                    </span>
                                </div>

                                <h3 className="font-bold text-xl mb-2 line-clamp-1 group-hover:text-indigo-500 transition-colors">{project.title}</h3>
                                <p className="text-[var(--muted)] text-sm mb-6 line-clamp-2 h-10 leading-relaxed">
                                    {project.description}
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm py-2 border-t border-[var(--border)] border-dashed">
                                        <span className="text-[var(--muted)] flex items-center gap-2">
                                            <Calendar className="w-4 h-4" /> Due Date
                                        </span>
                                        <span className="font-medium">
                                            {project.due_date ? new Date(project.due_date).toLocaleDateString() : 'Not set'}
                                        </span>
                                    </div>

                                    {project.assigned_to ? (
                                        <div className="flex items-center justify-between text-sm py-2 border-t border-[var(--border)] border-dashed">
                                            <span className="text-[var(--muted)] flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Assigned
                                            </span>
                                            <span className="text-xs px-2 py-1 rounded bg-[var(--secondary)] text-[var(--foreground)]">
                                                Active
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between text-sm py-2 border-t border-[var(--border)] border-dashed">
                                            <span className="text-[var(--muted)] flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-yellow-500" /> Status
                                            </span>
                                            <span className="text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-500">
                                                Unassigned
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-[var(--secondary)]/30 border-t border-[var(--border)] flex items-center justify-between group-hover:bg-indigo-500/5 transition-colors">
                                <span className="text-xs text-[var(--muted)]">
                                    Posted {new Date(project.created_at).toLocaleDateString()}
                                </span>
                                <button
                                    onClick={() => handleEditClick(project)}
                                    className="text-xs font-bold text-indigo-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0"
                                >
                                    Manage <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-[var(--surface)] rounded-2xl border border-[var(--border)] border-dashed">
                    <div className="w-16 h-16 bg-[var(--secondary)] rounded-full flex items-center justify-center mx-auto mb-6">
                        <Briefcase className="w-8 h-8 text-[var(--muted)] opacity-50" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No projects found</h3>
                    <p className="text-[var(--muted)] max-w-md mx-auto mb-8">
                        {searchQuery ? 'Try adjusting your search filters to find what you looking for.' : 'Create your first project to start tracking deliverables and progress.'}
                    </p>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="btn-primary bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 px-8 py-3 rounded-xl inline-flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Create Project
                    </button>
                </div>
            )}

            <NewProjectModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={() => {
                    setIsCreateOpen(false);
                    fetchProjects();
                }}
            />

            <EditProjectModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSuccess={() => {
                    setIsEditOpen(false);
                    fetchProjects();
                }}
                project={selectedProject}
            />
        </div>
    );
}
