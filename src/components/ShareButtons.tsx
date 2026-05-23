'use client';
import { useEffect, useState } from 'react';

export default function ShareButtons({ businessName, score, url }: { businessName: string; score: number; url: string }) {
  const [copied, setCopied] = useState(false);

  const shareWhatsApp = () => {
    const text = `I checked ${businessName}'s digital score: ${score}/100. Check yours free: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const shareLinkedIn = () => {
    const text = `Just checked my business digital score - ${score}/100! Check yours:`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <button onClick={shareWhatsApp} className="px-4 py-2 bg-green-600 text-white rounded text-sm">
        Share on WhatsApp
      </button>
      <button onClick={shareLinkedIn} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">
        Share on LinkedIn
      </button>
      <button onClick={copyLink} className="px-4 py-2 bg-white/10 text-white rounded text-sm">
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  );
}
