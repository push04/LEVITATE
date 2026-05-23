'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Analytics() {
  const [events, setEvents] = useState<any[]>([]);
  const [groqUsage, setGroqUsage] = useState<any>(null);
  const [ttv, setTtv] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('conversion_events').select('*').limit(100).then(({ data }: { data: any[] | null }) => setEvents(data || []));
    supabase.from('groq_rate_tracker').select('*').then(({ data }: { data: any[] | null }) => setGroqUsage(data || []));
    supabase.from('workspaces').select('first_agent_output_at, created_at').not('first_agent_output_at', 'is', null).then(({ data }: { data: Array<{ first_agent_output_at: string; created_at: string }> | null }) => {
      if (data) {
        const ttvs = data.map((w: { first_agent_output_at: string; created_at: string }) => new Date(w.first_agent_output_at).getTime() - new Date(w.created_at).getTime());
        const median = ttvs.sort()[Math.floor(ttvs.length / 2)];
        setTtv({ median: Math.floor(median / 60000), count: data.length });
      }
    });
  }, []);

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold text-[#C8A96E] mb-8">Analytics Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-white/5 rounded-lg">
          <div className="text-sm text-white/60">Total Events</div>
          <div className="text-2xl font-bold">{events.length}</div>
        </div>
        <div className="p-4 bg-white/5 rounded-lg">
          <div className="text-sm text-white/60">Groq Usage</div>
          <div className="text-2xl font-bold">{groqUsage?.length || 0} models</div>
        </div>
        <div className="p-4 bg-white/5 rounded-lg">
          <div className="text-sm text-white/60">Median TTV</div>
          <div className="text-2xl font-bold">{ttv ? `${ttv.median} min` : '--'}</div>
          <div className="text-xs text-white/40 mt-1">Target: under 48 hours</div>
        </div>
      </div>

      <div className="p-4 bg-white/5 rounded-lg mb-8">
        <h2 className="text-xl text-[#C8A96E] mb-4">Conversion Events (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={events.slice(0, 30)}>
            <XAxis dataKey="event_type" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="id" fill="#C8A96E" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="p-4 bg-white/5 rounded-lg">
        <h2 className="text-xl text-[#C8A96E] mb-4">Time to Value Distribution</h2>
        <p className="text-sm text-white/60">Median: {ttv?.median || '--'} minutes across {ttv?.count || 0} workspaces</p>
        {ttv && ttv.median > 2880 && (
          <div className="mt-2 p-2 bg-red-500/20 text-red-400 rounded text-sm">
            ⚠️ Alert: Median TTV exceeds 48 hours!
          </div>
        )}
      </div>
    </div>
  );
}
