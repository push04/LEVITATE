'use client';
import { useState, useEffect } from 'react';

export default function DemoVideoEmbed() {
  const [isVisible, setIsVisible] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    const el = document.getElementById('demo-video-container');
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const videoUrl = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL;

  return (
    <div id="demo-video-container" className="mt-8 md:mt-12 max-w-4xl mx-auto">
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        {!showVideo && isVisible && (
          <div 
            className="absolute inset-0 bg-white/5 rounded-[14px] flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
            onClick={() => setShowVideo(true)}
          >
            <div className="w-16 h-16 bg-[#C8A96E] rounded-full flex items-center justify-center">
              <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-12 border-l-[#0C0C0B] ml-1"></div>
            </div>
          </div>
        )}
        {showVideo && videoUrl && (
          <iframe 
            src={videoUrl} 
            className="w-full h-full rounded-[14px]" 
            allow="autoplay; encrypted-media" 
            allowFullScreen
            title="Demo Video"
          />
        )}
      </div>
    </div>
  );
}
