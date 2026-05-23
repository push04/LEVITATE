#!/bin/bash
echo "=== BUILDING ALL REMAINING TO 100% ==="

# Section 1.5 - Fix DemoVideoEmbed with proper implementation
cat > src/components/media/DemoVideoEmbed.tsx << 'EOF'
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
EOF

# Section 2.1 - Complete DemoDashboardClient
cat > src/app/demo/DemoDashboardClient.tsx << 'EOF'
'use client';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DEMO_LEADS, DEMO_AGENT_ACTIVITY, DEMO_MRR_TREND, DEMO_PIPELINE_COUNTS, DEMO_AGENT_CREDITS } from '@/lib/demoData';

export default function DemoDashboardClient() {
  const [activities, setActivities] = useState(DEMO_AGENT_ACTIVITY.slice(0, 5));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActivities(prev => {
        const next = [...prev];
        const moved = next.shift();
        if (moved) next.push(DEMO_AGENT_ACTIVITY[Math.floor(Math.random() * DEMO_AGENT_ACTIVITY.length)]);
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-[#C8A96E] mb-4">Revenue Pipeline</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={DEMO_MRR_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip />
              <Line type="monotone" dataKey="mrr" stroke="#C8A96E" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-[#C8A96E] mb-4">Lead Funnel</h3>
          {Object.entries(DEMO_PIPELINE_COUNTS).map(([stage, count]) => (
            <div key={stage} className="flex justify-between py-2 border-b border-white/10">
              <span className="text-sm text-white/60">{stage}</span>
              <span className="text-sm font-bold">{String(count)}</span>
            </div>
          ))}
        </div>

        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-[#C8A96E] mb-4">Agent Activity</h3>
          <div className="space-y-2">
            {activities.map((activity, i) => (
              <div key={i} className="text-xs text-white/60 animate-pulse">{activity}</div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-[#C8A96E] mb-4">Hot Leads</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-white/40"><th>Name</th><th>Score</th></tr></thead>
            <tbody>
              {DEMO_LEADS.slice(0, 5).map(lead => (
                <tr key={lead.id} className="border-b border-white/10">
                  <td className="py-2">{lead.name}</td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs ${
                      lead.score >= 8 ? 'bg-green-500/20 text-green-400' : 
                      lead.score >= 5 ? 'bg-yellow-500/20 text-yellow-400' : 
                      'bg-red-500/20 text-red-500'
                    }`}>
                      {lead.score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-[#C8A96E] mb-4">Agent Leaderboard</h3>
          {Object.entries(DEMO_AGENT_CREDITS).map(([name, score]) => (
            <div key={name} className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/60">{name}</span>
                <span>{String(score)}</span>
              </div>
              <div className="w-full bg-white/10 rounded h-2">
                <div className="bg-[#C8A96E] h-2 rounded" style={{ width: `${score}%` }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-[#C8A96E] mb-4">Websites Deployed</h3>
          <div className="text-3xl font-bold">12</div>
          <div className="mt-2 bg-white/10 rounded h-2">
            <div className="bg-[#C8A96E] h-2 rounded w-3/4"></div>
          </div>
          <div className="text-xs text-white/40 mt-1">Goal: 16 this month</div>
        </div>
      </div>
    </div>
  );
}
EOF

# Section 3.1 - Complete start-trial function
cat > netlify/functions/start-trial.ts << 'EOF'
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  
  const { workspace_id } = JSON.parse(event.body || '{}');
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  
  await supabase.from('workspaces').update({
    plan: 'trial',
    trial: true,
    trial_start: now.toISOString(),
    trial_end: trialEnd.toISOString()
  }).eq('id', workspace_id);
  
  // Seed demo data
  const { DEMO_LEADS } = await import('@/lib/demoData');
  await supabase.from('leads').insert(DEMO_LEADS.map(l => ({ ...l, workspace_id })));
  
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
EOF

# Add sticky banner to demo page
cat > src/app/demo/page.tsx << 'EOF'
import DemoDashboardClient from './DemoDashboardClient';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#0C0C0B] text-[#F2EFE9]">
      <div className="sticky top-0 z-50 bg-[#C8A96E] text-[#0C0C0B] px-4 py-2 flex items-center justify-between text-sm">
        <span>You're viewing a live demo with sample data — </span>
        <a href="/onboard" className="underline font-semibold">Activate your workspace →</a>
      </div>
      <DemoDashboardClient />
    </div>
  );
}
EOF

echo "=== ALL CORE SECTIONS COMPLETE ==="
