'use client';

import { Share2, Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface ShareButtonProps {
    title: string;
    text: string;
    url?: string;
}

export default function ShareButton({ title, text, url }: ShareButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        const shareData = {
            title,
            text,
            url: url || window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            // Fallback to clipboard
            try {
                await navigator.clipboard.writeText(shareData.url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    };

    return (
        <button
            onClick={handleShare}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] transition-all shadow-lg hover:shadow-xl group active:scale-95"
        >
            {copied ? (
                <>
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="font-bold text-green-500">Link Copied!</span>
                </>
            ) : (
                <>
                    <Share2 className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--primary)]" />
                    <span className="font-bold group-hover:text-[var(--foreground)]">Share Article</span>
                </>
            )}
        </button>
    );
}
