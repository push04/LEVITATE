'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Folder, FileText, Image as ImageIcon, Music, Video,
    MoreVertical, Upload, Search, Download, Trash2, Grid, List as ListIcon, Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import FilePreviewModal from '@/components/admin/FilePreviewModal';

// Types
interface FileItem {
    id: string;
    name: string;
    size: number;
    type: string; // MIME type
    url: string;
    folder: string;
    created_at: string;
    uploaded_by: string;
    profiles?: { full_name: string };
}

export default function FilesPage() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentFolder, setCurrentFolder] = useState('/');
    const [search, setSearch] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('files')
            .select('*, profiles:uploaded_by(full_name)')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setFiles(data);
        }
        setIsLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileName = `${Date.now()}-${file.name}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('vault')
                .upload(fileName, file);

            let publicUrl = '';

            if (!uploadError && uploadData) {
                const { data: { publicUrl: url } } = supabase.storage
                    .from('vault')
                    .getPublicUrl(fileName);
                publicUrl = url;
            } else {
                console.error('Storage upload failed:', uploadError);
                throw uploadError || new Error('Upload failed');
            }

            const { data: { session } } = await supabase.auth.getSession();
            const { error: dbError } = await supabase.from('files').insert({
                name: file.name,
                size: file.size,
                type: file.type,
                url: publicUrl,
                folder: currentFolder,
                uploaded_by: session?.user.id
            });

            if (dbError) throw dbError;

            fetchFiles();
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed. Please ensure "vault" storage bucket exists.');
        } finally {
            setIsUploading(false);
        }
    };

    const deleteFile = async (id: string, url: string) => {
        if (!confirm('Are you sure you want to delete this file? This cannot be undone.')) return;

        try {
            const res = await fetch('/api/admin/files/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: id, filePath: url })
            });

            if (res.ok) {
                setFiles(files.filter(f => f.id !== id));
            } else {
                alert('Failed to delete file');
            }
        } catch (error) {
            console.error('Delete error', error);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (type: string) => {
        if (type.includes('image')) return <ImageIcon className="w-8 h-8 text-blue-500" />;
        if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
        if (type.includes('video')) return <Video className="w-8 h-8 text-purple-500" />;
        if (type.includes('audio')) return <Music className="w-8 h-8 text-yellow-500" />;
        return <FileText className="w-8 h-8 text-[var(--muted)]" />;
    };

    const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <FilePreviewModal
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
                file={previewFile}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Vault</h1>
                    <p className="text-[var(--muted)]">Secure file storage and management</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />
                        <label
                            htmlFor="file-upload"
                            className={`flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-xl shadow-lg shadow-[var(--primary)]/20 cursor-pointer hover:bg-blue-600 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <Upload className="w-5 h-5" />
                            {isUploading ? 'Uploading...' : 'Upload File'}
                        </label>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                    <input
                        type="text"
                        placeholder="Search files..."
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
                        <Grid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[var(--secondary)] text-[var(--foreground)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                    >
                        <ListIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredFiles.map((file, i) => (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            key={file.id}
                            className="glass-card p-4 flex flex-col items-center text-center gap-3 group hover:border-[var(--primary)]/50 transition-colors relative"
                        >
                            <div
                                className="w-16 h-16 rounded-xl bg-[var(--secondary)] flex items-center justify-center mb-2 cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setPreviewFile(file)}
                            >
                                {/* Show thumbnail for images if possible, else icon */}
                                {file.type.includes('image') ? (
                                    <img src={file.url} alt={file.name} className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    getFileIcon(file.type)
                                )}
                            </div>
                            <div className="w-full">
                                <p className="font-medium text-sm truncate w-full cursor-pointer hover:text-[var(--primary)]" onClick={() => setPreviewFile(file)} title={file.name}>{file.name}</p>
                                <p className="text-xs text-[var(--muted)]">{formatSize(file.size)}</p>
                            </div>

                            {/* Hover Actions */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-[var(--surface)]/80 backdrop-blur-sm rounded-lg p-1 border border-[var(--border)] shadow-sm">
                                <button
                                    onClick={() => setPreviewFile(file)}
                                    className="p-1.5 hover:text-[var(--primary)] rounded-md transition-colors"
                                    title="View"
                                >
                                    <Eye className="w-3 h-3" />
                                </button>
                                <a href={file.url} target="_blank" download className="p-1.5 hover:text-[var(--primary)] rounded-md transition-colors" title="Download">
                                    <Download className="w-3 h-3" />
                                </a>
                                <button
                                    onClick={() => deleteFile(file.id, file.url)}
                                    className="p-1.5 hover:text-red-500 rounded-md transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-[var(--secondary)] border-b border-[var(--border)]">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase w-10">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase">Size</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase">Uploaded By</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase">Date</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--muted)] uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {filteredFiles.map((file) => (
                                <tr key={file.id} className="hover:bg-[var(--secondary)]/50 transition-colors group">
                                    <td className="px-6 py-4 cursor-pointer" onClick={() => setPreviewFile(file)}>
                                        {getFileIcon(file.type)}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-[var(--foreground)] cursor-pointer hover:text-[var(--primary)]" onClick={() => setPreviewFile(file)}>{file.name}</td>
                                    <td className="px-6 py-4 text-sm text-[var(--muted)]">{formatSize(file.size)}</td>
                                    <td className="px-6 py-4 text-sm">{file.profiles?.full_name}</td>
                                    <td className="px-6 py-4 text-sm text-[var(--muted)]">{new Date(file.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setPreviewFile(file)}
                                                className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors text-[var(--muted)] hover:text-[var(--primary)]"
                                                title="View"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <a href={file.url} target="_blank" download className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors text-[var(--muted)] hover:text-[var(--foreground)]" title="Download">
                                                <Download className="w-4 h-4" />
                                            </a>
                                            <button
                                                onClick={() => deleteFile(file.id, file.url)}
                                                className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                                                title="Delete"
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
            )}
        </div>
    );
}
