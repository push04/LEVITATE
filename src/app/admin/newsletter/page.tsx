'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function NewsletterAdmin() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('newsletter_subscribers').select('*').then(({ data }) => {
      setSubscribers(data || []);
      setLoading(false);
    });
  }, []);

  const bySource = subscribers.reduce((acc: any, s) => { acc[s.source] = (acc[s.source] || 0) + 1; return acc; }, {});
  const chartData = Object.entries(bySource).map(([source, count]) => ({ source, count }));

  const exportCSV = () => {
    const csv = 'email,source,subscribed_at,confirmed\n' + subscribers.map(s => `${s.email},${s.source},${s.subscribed_at},${s.confirmed}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newsletter-subscribers.csv';
    a.click();
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold text-[#C8A96E] mb-8">Newsletter Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-white/5 rounded-lg">
          <div className="text-sm text-white/60">Total Subscribers</div>
          <div className="text-2xl font-bold">{subscribers.length}</div>
        </div>
        <div className="p-4 bg-white/5 rounded-lg">
          <div className="text-sm text-white/60">Confirmed</div>
          <div className="text-2xl font-bold">{subscribers.filter(s => s.confirmed).length}</div>
        </div>
        <div className="p-4 bg-white/5 rounded-lg">
          <div className="text-sm text-white/60">Sources</div>
          <div className="text-2xl font-bold">{Object.keys(bySource).length}</div>
        </div>
      </div>
      <div className="mb-8 p-4 bg-white/5 rounded-lg">
        <h2 className="text-xl text-[#C8A96E] mb-4">Subscribers by Source</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="source" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#C8A96E" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <button onClick={exportCSV} className="px-4 py-2 bg-[#C8A96E] text-black rounded hover:brightness-110">
        Export to CSV
      </button>
    </div>
  );
}
