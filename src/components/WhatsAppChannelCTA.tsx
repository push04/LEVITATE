'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function WhatsAppChannelCTA() {
  const [count, setCount] = useState<string>('500+');

  useEffect(() => {
    const stored = process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_COUNT;
    if (stored) setCount(stored);
  }, []);

  const handleClick = async () => {
    const supabase = createClient();
    await supabase.from('conversion_events').insert({
      event_type: 'whatsapp_channel_cta_clicked',
      page_url: window.location.pathname
    });
    window.open(process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL, '_blank');
  };

  return (
    <div className="mt-6 p-4 bg-green-600/10 border border-green-600/30 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">W</div>
        <div>
          <div className="text-white font-semibold">Join {count} business owners</div>
          <div className="text-white/60 text-sm">Get daily automation tips on WhatsApp</div>
        </div>
      </div>
      <button
        onClick={handleClick}
        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
      >
        Join Channel →
      </button>
    </div>
  );
}
