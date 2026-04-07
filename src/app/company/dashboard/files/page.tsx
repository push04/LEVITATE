'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Search, FileText, Download, Trash2, Filter, ExternalLink } from 'lucide-react';
import UploadFileModal from '@/components/company/UploadFileModal';
import { supabase } from '@/lib/supabase';

export default function CompanyFiles() {
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchFiles = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: company } = await supabase
                .from('companies')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            if (company) {
                // Fetch files for all company projects
                // We need to join with projects to filter by company_id, 
                // but standard supabase-js join syntax is tricky without foreign key embedding in query
                // or we use a view.
                // Alternatively, fetch projects first then files in `in`.

                const { data: projects } = await supabase
                    .from('projects')
                    .select('id, title')
                    .eq('company_id', company.id);

                if (projects && projects.length > 0) {
                    const projectIds = projects.map(p => p.id);
                    const { data: fileData } = await supabase
                        .from('project_files')
                        .select('*, projects(title)')
                        .in('project_id', projectIds)
                        .order('created_at', { ascending: false });

                    if (fileData) {
                        setFiles(fileData);
                    }
                } else {
                    setFiles([]);
                }
            }
        } catch (error) {
            console.error('Error fetching files:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    const filteredFiles = files.filter(file =>
        file.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        // @ts-ignore
        file.projects?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div>
                    <h1 className="text-2xl font-bold font-heading">Files</h1>
                    <p className="text-[var(--muted)]">Access and manage project documents</p>
                </div>
                <button
                    onClick={() => setIsUploadOpen(true)}
                    className="btn-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 px-4 py-2 flex items-center gap-2"
                >
                    <Upload className="w-5 h-5" />
                    Upload File
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            {/* Files Grid */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-[var(--muted)]">Loading files...</p>
                </div>
            ) : filteredFiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredFiles.map((file, index) => (
                        <motion.div
                            key={file.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:border-indigo-500/50 transition-all group flex flex-col"
                        >
                            <div className="aspect-video rounded-lg bg-[var(--secondary)] mb-4 flex items-center justify-center relative overflow-hidden group-hover:bg-indigo-500/5 transition-colors">
                                {/* Preview or Icon */}
                                {file.file_type?.startsWith('image/') ? (
                                    <img src={file.file_url} alt={file.file_name} className="w-full h-full object-cover" />
                                ) : (
                                    <FileText className="w-12 h-12 text-[var(--muted)] group-hover:text-indigo-500 transition-colors" />
                                )}

                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <a
                                        href={file.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                                        title="View"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                    <a
                                        href={file.file_url}
                                        download
                                        className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                                        title="Download"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="font-medium text-sm truncate mb-1" title={file.file_name}>{file.file_name}</h3>
                                <p className="text-xs text-[var(--muted)] flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                    {/* @ts-ignore */}
                                    {file.projects?.title || 'Unknown Project'}
                                </p>
                            </div>

                            <div className="mt-3 text-xs text-[var(--muted)] border-t border-[var(--border)] pt-3 flex justify-between">
                                <span>{new Date(file.created_at).toLocaleDateString()}</span>
                                <span className="uppercase">{file.file_type?.split('/')[1] || 'FILE'}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                    <FileText className="w-12 h-12 text-[var(--muted)] mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-1">No files found</h3>
                    <p className="text-[var(--muted)] text-sm mb-6">
                        Upload documents and assets for your projects
                    </p>
                    <button
                        onClick={() => setIsUploadOpen(true)}
                        className="btn-primary bg-indigo-600 hover:bg-indigo-700 inline-flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        Upload File
                    </button>
                </div>
            )}

            <UploadFileModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                onSuccess={() => {
                    setIsUploadOpen(false);
                    fetchFiles();
                }}
            />
        </div>
    );
}
