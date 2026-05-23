'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ExternalLink, FileText } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    file: {
        name: string;
        url: string;
        type: string;
    } | null;
}

export default function FilePreviewModal({ isOpen, onClose, file }: Props) {
    if (!isOpen || !file) return null;

    const isImage = file.type.includes('image');
    const isPDF = file.type.includes('pdf');

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-4 md:inset-10 z-50 flex flex-col pointer-events-none"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--border)] rounded-t-xl pointer-events-auto">
                            <h2 className="font-bold flex items-center gap-2 truncate text-white">
                                <FileText className="w-5 h-5 text-[var(--primary)]" />
                                {file.name}
                            </h2>
                            <div className="flex items-center gap-2">
                                <a
                                    href={file.url}
                                    target="_blank"
                                    download
                                    className="p-2 hover:bg-[var(--secondary)] rounded-lg transition-colors"
                                    title="Download"
                                >
                                    <Download className="w-5 h-5" />
                                </a>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-[var(--secondary)] rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 bg-black/50 backdrop-blur-md rounded-b-xl overflow-hidden flex items-center justify-center border-x border-b border-[var(--border)] pointer-events-auto relative">
                            {isImage ? (
                                <img
                                    src={file.url}
                                    alt={file.name}
                                    className="max-w-full max-h-full object-contain"
                                />
                            ) : isPDF ? (
                                <iframe
                                    src={`${file.url}#toolbar=0`}
                                    className="w-full h-full"
                                    title={file.name}
                                />
                            ) : (
                                <div className="text-center p-8">
                                    <p className="text-[var(--muted)] mb-4">Preview not available for this file type.</p>
                                    <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary inline-flex items-center gap-2"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Open in New Tab
                                    </a>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
