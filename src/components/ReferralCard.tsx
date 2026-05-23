'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function ReferralCard({ workspaceId }: { workspaceId: string }) {
  const [copied, setCopied] = useState(false);
  const referralLink = `${process.env.NEXT_PUBLIC_PLATFORM_URL}/r/${workspaceId}`;
  
  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="p-4 bg-white/5 rounded-lg">
      <h3 className="text-[#C8A96E] mb-2">Refer & Earn</h3>
      <input readOnly value={referralLink} className="w-full bg-white/10 p-2 rounded mb-2 text-sm" />
      <button onClick={copyLink} className="px-4 py-2 bg-[#C8A96E] text-black rounded">
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  );
}
