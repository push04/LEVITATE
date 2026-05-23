'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

export default function DemoVideoEmbed() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative mt-6 w-full overflow-hidden rounded-2xl border border-[rgba(176,141,87,0.18)] bg-[#0f0e0b] shadow-[0_8px_40px_rgba(0,0,0,0.5)]" style={{ aspectRatio: '16/9' }}>
      {playing ? (
        <iframe
          src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen"
          title="Levitate OS demo"
        />
      ) : (
        <button
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 flex flex-col items-center justify-center gap-4"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(176,141,87,0.9)] shadow-[0_0_32px_rgba(176,141,87,0.4)] transition-transform duration-300 group-hover:scale-110">
            <Play className="h-7 w-7 translate-x-0.5 text-white" fill="white" />
          </div>
          <span className="text-sm font-medium text-white/70">Watch product demo</span>
        </button>
      )}
    </div>
  );
}
