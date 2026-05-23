'use client';

import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, CheckCircle2, Clock, MoreVertical, Plus,
    Paperclip, MessageSquare, ChevronLeft, User as UserIcon,
    AlertCircle, GripVertical, Trash2, Edit2, X, Save,
    Download, Upload, Image as ImageIcon, FileText, UserCog
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import ManageTeamModal from '@/components/admin/ManageTeamModal';

// Types
interface Task {
    id: string;
    title: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    assigned_to: string;
    due_date: string;
    priority?: 'low' | 'medium' | 'high';
    profiles?: { full_name: string; avatar_url: string };
}

interface Project {
    id: string;
    title: string;
    description: string;
    status: string;
    client_name: string;
    start_date: string;
    due_date: string;
    assigned_to?: string;
    profiles?: {
        full_name: string;
        avatar_url: string;
        role: string;
    };
}

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isAddingTask, setIsAddingTask] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string>('');
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'tasks' | 'files'>('tasks');
    const [files, setFiles] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [filePreview, setFilePreview] = useState<any | null>(null);
    const [isManagingTeam, setIsManagingTeam] = useState(false);

    useEffect(() => {
        if (activeTab === 'files' && id) {
            // We can define/call fetchFiles here or hoist it. 
            // Since fetchFiles is async and depends on state, let's define it inside or use a ref. 
            // Actually, determining fetchFiles here is fine if I define it below.
            // But wait, I can just define fetchFiles as a const here.
            (async () => {
                const { data, error } = await supabase
                    .from('files')
                    .select('*, profiles:uploaded_by(full_name)')
                    .eq('project_id', id)
                    .order('created_at', { ascending: false });
                if (data) setFiles(data);
            })();
        }
    }, [activeTab, id]);

    // Redefining fetchFiles for manual refresh calls (like after upload)
    const fetchFiles = async () => {
        const { data, error } = await supabase
            .from('files')
            .select('*, profiles:uploaded_by(full_name)')
            .eq('project_id', id)
            .order('created_at', { ascending: false });

        if (data) setFiles(data);
    };

    useEffect(() => {
        const handleClickOutside = () => {
            setActiveDropdown(null);
            setSelectedUser(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const deleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) return;

        setTasks(prev => prev.filter(t => t.id !== taskId));
        await supabase.from('tasks').delete().eq('id', taskId);

        confetti({
            particleCount: 50,
            spread: 40,
            origin: { y: 0.7 },
            colors: ['#ef4444', '#b91c1c']
        });
    };

    const updateTaskDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask) return;

        setTasks(prev => prev.map(t => t.id === editingTask.id ? editingTask : t));

        const { error } = await supabase
            .from('tasks')
            .update({
                title: editingTask.title,
                priority: editingTask.priority,
                due_date: editingTask.due_date,
            })
            .eq('id', editingTask.id);

        if (error) {
            alert('Failed to update task');
        }

        setEditingTask(null);
    };

    const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    useEffect(() => {
        fetchProjectData();
    }, [id]);

    const fetchProjectData = async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                if (profile) setUserRole(profile.role);
            }

            // Fetch project with primary assignee details
            const { data: proj } = await supabase
                .from('projects')
                .select('*, profiles:assigned_to(full_name, avatar_url, role)')
                .eq('id', id)
                .single();

            if (proj) setProject(proj);

            // Fetch assigned users from join table
            const { data: assignments } = await supabase
                .from('project_assignments')
                .select('user_id, role, profiles:user_id(full_name, avatar_url, role)')
                .eq('project_id', id);

            let users: any[] = [];

            if (assignments) {
                users = assignments.map((a: any) => ({
                    id: a.user_id,
                    name: a.profiles?.full_name,
                    avatar: a.profiles?.avatar_url,
                    role: a.profiles?.role,
                    projectRole: a.role
                }));
            }

            // Merge primary assignee if exists and not already in list
            if (proj?.assigned_to && proj?.profiles) {
                const primaryId = proj.assigned_to;
                const exists = users.find(u => u.id === primaryId);
                if (!exists) {
                    users.unshift({
                        id: primaryId,
                        name: proj.profiles.full_name,
                        avatar: proj.profiles.avatar_url,
                        role: proj.profiles.role,
                        projectRole: 'Lead' // Assume primary assigned is Lead
                    });
                }
            }

            setAssignedUsers(users);

            const { data: taskList } = await supabase
                .from('tasks')
                .select('*, profiles:assigned_to(full_name, avatar_url)')
                .eq('project_id', id)
                .order('created_at');

            if (taskList) setTasks(taskList);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const addTask = async (status: Task['status']) => {
        if (!newTaskTitle.trim()) return;

        const { data: { session } } = await supabase.auth.getSession();

        const { data, error } = await supabase
            .from('tasks')
            .insert({
                project_id: id,
                title: newTaskTitle,
                status,
                assigned_to: session?.user.id
            })
            .select('*, profiles:assigned_to(full_name, avatar_url)')
            .single();

        if (data) {
            setTasks([...tasks, data]);
            setNewTaskTitle('');
            setIsAddingTask(null);
        }
    };

    const isAllowedToMoveToDone = () => {
        return ['super_admin', 'admin', 'manager'].includes(userRole);
    };

    const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
        if (newStatus === 'done' && !isAllowedToMoveToDone()) {
            alert("Only Admins or Managers can mark tasks as Done.");
            return;
        }

        if (newStatus === 'done') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#2563eb', '#9333ea', '#10b981']
            });
        }

        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    };

    const onDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const onDrop = (e: React.DragEvent, status: Task['status']) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) updateTaskStatus(taskId, status);
        setDraggedTaskId(null);
    };

    const getPriorityColor = (priority?: string) => {
        switch (priority) {
            case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'medium': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    if (isLoading) return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col p-4 animate-pulse">
            <div className="h-10 bg-[var(--secondary)] rounded-lg w-1/3 mb-4"></div>
            <div className="flex gap-6 h-full min-w-[1000px]">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex-1 bg-[var(--surface)]/50 rounded-xl border border-[var(--border)] p-4">
                        <div className="h-6 bg-[var(--secondary)] rounded w-1/2 mb-4"></div>
                        <div className="space-y-3">
                            <div className="h-24 bg-[var(--secondary)] rounded-lg"></div>
                            <div className="h-24 bg-[var(--secondary)] rounded-lg"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (!project) return <div className="p-8 text-center text-[var(--muted)]">Project not found</div>;

    const columns: { id: Task['status']; label: string; color: string; border: string }[] = [
        { id: 'todo', label: 'To Do', color: 'text-gray-500', border: 'border-gray-500/20' },
        { id: 'in_progress', label: 'In Progress', color: 'text-blue-500', border: 'border-blue-500/20' },
        { id: 'review', label: 'Review', color: 'text-purple-500', border: 'border-purple-500/20' },
        { id: 'done', label: 'Done', color: 'text-green-500', border: 'border-green-500/20' },
    ];



    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileName = `projects/${id}/${Date.now()}-${file.name}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('vault')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('vault')
                .getPublicUrl(fileName);

            const { data: { session } } = await supabase.auth.getSession();
            const { error: dbError } = await supabase.from('files').insert({
                name: file.name,
                size: file.size,
                type: file.type,
                url: publicUrl,
                folder: `projects/${id}`,
                project_id: id,
                uploaded_by: session?.user.id
            });

            if (dbError) throw dbError;

            fetchFiles();
            confetti({
                particleCount: 30,
                spread: 50,
                origin: { y: 0.7 },
                colors: ['#3b82f6', '#10b981']
            });
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const deleteFile = async (fileId: string, filePath: string) => {
        if (!confirm('Delete this file?')) return;

        // Extract path from URL if needed, or use stored path logic
        // For simplicity assuming we delete record and ideally file, but simpler to just delete record first for UI
        // In real app, delete from storage too.

        await supabase.from('files').delete().eq('id', fileId);
        setFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <AnimatePresence>
                {editingTask && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[var(--surface)] w-full max-w-md rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
                        >
                            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--background)]">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Edit2 className="w-4 h-4 text-[var(--primary)]" />
                                    Edit Task
                                </h3>
                                <button onClick={() => setEditingTask(null)} className="p-1 hover:bg-[var(--secondary)] rounded-lg transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={updateTaskDetails} className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-[var(--muted)]">Task Title</label>
                                    <input
                                        value={editingTask.title}
                                        onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                                        placeholder="Task title"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[var(--muted)]">Priority</label>
                                        <select
                                            value={editingTask.priority || 'medium'}
                                            onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as any })}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)] appearance-none cursor-pointer"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[var(--muted)]">Due Date</label>
                                        <input
                                            type="date"
                                            value={editingTask.due_date ? new Date(editingTask.due_date).toISOString().split('T')[0] : ''}
                                            onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditingTask(null)}
                                        className="flex-1 px-4 py-2 border border-[var(--border)] rounded-xl text-sm font-medium hover:bg-[var(--secondary)] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col gap-6 shrink-0 px-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard/projects" className="p-2 hover:bg-[var(--secondary)] rounded-xl transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-3">
                                {project.title}
                                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${project.status === 'completed' ? 'text-green-500 border-green-500/20 bg-green-500/10' :
                                    'text-blue-500 border-blue-500/20 bg-blue-500/10'
                                    }`}>
                                    {project.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </h1>
                            <p className="text-[var(--muted)] text-sm mt-0.5 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]/50"></span>
                                {project.client_name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2 mr-4 relative">
                            {assignedUsers.length > 0 ? (
                                assignedUsers.map((user, i) => (
                                    <div key={user.id} className="relative group">
                                        <button
                                            onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                                            className="w-8 h-8 rounded-full border-2 border-[var(--background)] bg-[var(--secondary)] flex items-center justify-center overflow-hidden hover:z-10 focus:outline-none transition-transform hover:scale-110"
                                            title={user.name}
                                        >
                                            {user.avatar ? (
                                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[10px] font-bold">{user.name?.[0]}</span>
                                            )}
                                        </button>

                                        {/* User Details Popover */}
                                        {selectedUser?.id === user.id && (
                                            <div className="absolute top-10 right-0 z-50 w-48 bg-[var(--surface)] rounded-xl shadow-xl border border-[var(--border)] p-3 animate-in fade-in zoom-in duration-200">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-10 h-10 rounded-full bg-[var(--secondary)] overflow-hidden flex-shrink-0">
                                                        {user.avatar ? (
                                                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                                                                {user.name?.[0]}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm leading-tight">{user.name}</p>
                                                        <p className="text-xs text-[var(--muted)] capitalize">{user.role?.replace('_', ' ')}</p>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-[var(--muted)] border-t border-[var(--border)] pt-2 mt-2">
                                                    Project Role: <span className="text-[var(--foreground)] font-medium capitalize">{user.projectRole || 'Member'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="w-8 h-8 rounded-full border-2 border-[var(--background)] bg-[var(--secondary)] flex items-center justify-center text-[10px] text-[var(--muted)]">
                                    <UserIcon className="w-4 h-4" />
                                </div>
                            )}

                            {/* Add/Manage Button */}
                            {['super_admin', 'admin', 'manager'].includes(userRole) && (
                                <button
                                    onClick={() => setIsManagingTeam(true)}
                                    className="w-8 h-8 rounded-full border-2 border-[var(--background)] bg-[var(--secondary)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition-colors ml-[-8px] z-10 relative group"
                                    title="Manage Team"
                                >
                                    <UserCog className="w-4 h-4" />
                                </button>
                            )}

                        </div>

                        <div className="flex bg-[var(--secondary)] p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'tasks' ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                            >
                                Tasks
                            </button>
                            <button
                                onClick={() => setActiveTab('files')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'files' ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                            >
                                Files
                            </button>
                        </div>

                        <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20 transition-all">
                            <MessageSquare className="w-4 h-4" />
                            Chat
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'tasks' ? (
                    /* Kanban Board */
                    <div className="h-full overflow-x-auto overflow-y-hidden pb-4">
                        <div className="flex gap-6 h-full min-w-[1200px] px-1">
                            {columns.map(col => (
                                <div
                                    key={col.id}
                                    className="flex-1 flex flex-col min-w-[280px] bg-[var(--secondary)]/30 rounded-2xl border border-[var(--border)] backdrop-blur-sm"
                                    onDragOver={onDragOver}
                                    onDrop={(e) => onDrop(e, col.id)}
                                >
                                    {/* Column Header */}
                                    <div className="p-4 flex items-center justify-between sticky top-0 rounded-t-2xl z-10 glass-card border-b border-[var(--border)]">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${col.color.replace('text-', 'bg-')}`} />
                                            <h3 className="font-semibold text-sm">{col.label}</h3>
                                            <span className="text-xs text-[var(--muted)] font-medium px-2 py-0.5 bg-[var(--secondary)] rounded-full border border-[var(--border)]">
                                                {tasks.filter(t => t.status === col.id).length}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setIsAddingTask(col.id)}
                                            className="p-1.5 hover:bg-[var(--secondary)] rounded-lg transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Tasks List */}
                                    <div className={`flex-1 overflow-y-auto p-3 pb-32 space-y-3 custom-scrollbar ${draggedTaskId ? 'bg-[var(--surface)]/50 transition-colors' : ''}`}>
                                        <AnimatePresence mode="popLayout">
                                            {/* Add Task Input */}
                                            {isAddingTask === col.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="mb-3"
                                                >
                                                    <form
                                                        onSubmit={(e) => { e.preventDefault(); addTask(col.id); }}
                                                        className="bg-[var(--surface)] p-3 rounded-xl border border-[var(--primary)] shadow-lg shadow-[var(--primary)]/10"
                                                    >
                                                        <input
                                                            autoFocus
                                                            value={newTaskTitle}
                                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                                            placeholder="What needs to be done?"
                                                            className="w-full bg-transparent text-sm font-medium outline-none mb-3 placeholder:text-[var(--muted)]/50"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Escape') {
                                                                    setIsAddingTask(null);
                                                                    setNewTaskTitle('');
                                                                }
                                                            }}
                                                        />
                                                        <div className="flex justify-between items-center mb-2">
                                                            {/* Simple priority selector equivalent for quick add (hidden for simplicity, default medium) */}
                                                            <span className="text-[10px] text-[var(--muted)]">Press Enter to add</span>
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsAddingTask(null)}
                                                                className="text-xs px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--secondary)] rounded-lg transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="submit"
                                                                className="text-xs px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all sm-btn"
                                                            >
                                                                Add Task
                                                            </button>
                                                        </div>
                                                    </form>
                                                </motion.div>
                                            )}

                                            {/* Task Cards */}
                                            {tasks.filter(t => t.status === col.id).map((task) => (
                                                <motion.div
                                                    layout
                                                    layoutId={task.id}
                                                    key={task.id}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        // Prevent drag if touching the menu button
                                                        const target = e.target as HTMLElement;
                                                        if (target.closest('button')) {
                                                            e.preventDefault();
                                                            return;
                                                        }
                                                        onDragStart(e as any, task.id);
                                                    }}
                                                    style={{ zIndex: activeDropdown === task.id ? 50 : 'auto' }}
                                                    className={`group bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/50 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:-translate-y-0.5 relative overflow-visible ${activeDropdown === task.id ? 'z-50 border-[var(--primary)] shadow-md' : ''}`}
                                                >
                                                    {/* Priority Indicator */}
                                                    <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${task.priority === 'high' ? 'bg-red-500' :
                                                        task.priority === 'low' ? 'bg-green-500' :
                                                            'bg-orange-400/50' // Default medium
                                                        }`} />

                                                    <div className="flex justify-between items-start mb-3 gap-3 pl-3 relative">
                                                        <p className="font-medium text-sm text-[var(--foreground)] leading-relaxed flex-1">
                                                            {task.title}
                                                        </p>

                                                        {/* Delete Action */}
                                                        <button
                                                            onMouseDown={(e) => {
                                                                // Prevent drag start
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                            }}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                deleteTask(task.id);
                                                            }}
                                                            className="p-2 text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors z-50 relative"
                                                            title="Delete Task"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center justify-between pl-3 mt-2 pt-2 border-t border-[var(--border)]/50">
                                                        <div className="flex items-center gap-2">
                                                            {task.profiles?.avatar_url ? (
                                                                <img src={task.profiles.avatar_url} className="w-6 h-6 rounded-full border border-[var(--border)] shadow-sm" title={task.profiles.full_name} />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[9px] text-white font-bold border border-white/10 shadow-sm" title={task.profiles?.full_name}>
                                                                    {task.profiles?.full_name?.[0] || 'U'}
                                                                </div>
                                                            )}

                                                            {task.due_date && (
                                                                <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border ${new Date(task.due_date) < new Date() && task.status !== 'done'
                                                                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                                    : 'bg-[var(--secondary)] text-[var(--muted)] border-transparent'
                                                                    }`}>
                                                                    <Clock className="w-3 h-3" />
                                                                    <span>{new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                                </div>
                                                            )}

                                                            {task.priority && (
                                                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                                                                    {task.priority}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Mobile/Quick Move Dropdown */}
                                                        <select
                                                            value={task.status}
                                                            onChange={(e) => updateTaskStatus(task.id, e.target.value as any)}
                                                            className="md:hidden text-[10px] bg-[var(--secondary)] border border-[var(--border)] rounded px-1 py-0.5 outline-none"
                                                        >
                                                            {columns.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                                        </select>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Files View */
                    <div className="h-full overflow-y-auto p-4 custom-scrollbar">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Paperclip className="w-5 h-5 text-[var(--primary)]" />
                                Project Files
                            </h2>
                            <div className="relative">
                                <input
                                    type="file"
                                    id="project-file-upload"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                />
                                <label
                                    htmlFor="project-file-upload"
                                    className={`flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-xl shadow-lg shadow-[var(--primary)]/20 cursor-pointer hover:bg-blue-600 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    {isUploading ? (
                                        <Clock className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4" />
                                    )}
                                    {isUploading ? 'Uploading...' : 'Upload File'}
                                </label>
                            </div>
                        </div>

                        {files.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-[var(--muted)] border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--surface)]/50">
                                <Paperclip className="w-12 h-12 mb-4 opacity-50" />
                                <p className="font-medium">No files uploaded yet</p>
                                <p className="text-sm">Upload specifications, assets, or documents for this project</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {files.map((file, i) => (
                                    <div key={file.id} className="glass-card p-3 flex flex-col items-center gap-2 group relative hover:border-[var(--primary)]/50 transition-colors">
                                        <div className="w-12 h-12 bg-[var(--secondary)] rounded-lg flex items-center justify-center">
                                            {file.type.includes('image') ? <ImageIcon className="w-6 h-6 text-blue-500" /> : <FileText className="w-6 h-6 text-[var(--muted)]" />}
                                        </div>
                                        <div className="text-center w-full">
                                            <p className="text-xs font-medium truncate w-full" title={file.name}>{file.name}</p>
                                            <p className="text-[10px] text-[var(--muted)]">{formatSize(file.size)}</p>
                                        </div>
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a href={file.url} target="_blank" download className="p-1 hover:bg-[var(--background)] rounded text-[var(--muted)] hover:text-[var(--primary)] transition-colors">
                                                <Download className="w-3 h-3" />
                                            </a>
                                            <button onClick={() => deleteFile(file.id, file.url)} className="p-1 hover:bg-red-500/10 rounded text-[var(--muted)] hover:text-red-500 transition-colors">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <ManageTeamModal
                    isOpen={isManagingTeam}
                    onClose={() => {
                        setIsManagingTeam(false);
                        fetchProjectData(); // Refresh list
                    }}
                    projectId={id}
                    projectTitle={project?.title || ''}
                />
            </div>
        </div>
    );
}
