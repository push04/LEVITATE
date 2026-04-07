'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, ExternalLink, RefreshCw, Code, Loader2, Save } from 'lucide-react';

interface Hackathon {
    id: string;
    title: string;
    platform: 'Devpost' | 'MLH' | 'Unstop' | 'Devfolio' | 'HackerEarth';
    url: string;
    thumbnail?: string;
    location?: string;

    // AI Fields
    prizePool?: string;
    deadline?: string;
    techStack?: string[];
    relevanceScore?: number;
}

export default function HackathonScoutPage() {
    const [hackathons, setHackathons] = useState<Hackathon[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

    const fetchHackathons = async () => {
        setIsLoading(true);
        setHackathons([]);
        try {
            const res = await fetch('/api/admin/growth/hackathons');
            if (!res.body) throw new Error('No response body');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const chunk = JSON.parse(line);
                        if (chunk.error) {
                            console.error('Stream error:', chunk.error);
                        } else if (Array.isArray(chunk)) {
                            setHackathons(prev => {
                                const exist = new Set(prev.map(h => h.id));
                                const fresh = chunk.filter(h => !exist.has(h.id));
                                return [...prev, ...fresh];
                            });
                        }
                    } catch (e) {
                        console.error('JSON parse error', e);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch hackathons', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHackathons();
    }, []);

    const handleSave = async (h: Hackathon) => {
        // Optimistic UI
        const newSaved = new Set(savedIds);
        newSaved.add(h.id);
        setSavedIds(newSaved);

        // TODO: Persist to DB via API
        // await fetch('/api/admin/growth/hackathons/save', { method: 'POST', body: JSON.stringify(h) });
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                        Hackathon Scout
                    </h1>
                    <p className="text-[var(--muted)] mt-1">
                        AI-curated hackathons with high prize pools.
                    </p>
                </div>
                <button
                    onClick={fetchHackathons}
                    disabled={isLoading}
                    className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hackathons.map((h, i) => (
                    <motion.div
                        key={h.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass-card flex flex-col h-full overflow-hidden group hover:border-yellow-500/50 transition-all cursor-default"
                    >
                        {h.thumbnail && (
                            <div className="h-32 w-full overflow-hidden relative">
                                <img src={h.thumbnail} alt={h.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <div className="bg-black/70 backdrop-blur px-2 py-1 rounded text-xs font-bold text-white">
                                        {h.platform}
                                    </div>
                                    {h.location && (
                                        <div className={`px-2 py-1 rounded text-xs font-bold text-white ${h.location.includes('Remote') ? 'bg-green-600/80' : 'bg-blue-600/80'}`}>
                                            {h.location}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="p-5 flex flex-col flex-1">
                            <h3 className="font-bold text-lg mb-2 line-clamp-2">{h.title}</h3>

                            <div className="space-y-3 mb-4 flex-1">
                                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                    <span className="font-medium text-[var(--foreground)]">
                                        {h.prizePool || 'Prize Unknown'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                                    <Calendar className="w-4 h-4" />
                                    <span>{h.deadline ? new Date(h.deadline).toLocaleDateString() : 'Unknown Date'}</span>
                                </div>
                                {h.techStack && h.techStack.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {h.techStack.map(tag => (
                                            <span key={tag} className="px-2 py-0.5 rounded-full bg-[var(--secondary)] text-[10px] uppercase font-bold tracking-wide flex items-center gap-1">
                                                <Code className="w-3 h-3" /> {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 mt-auto">
                                <button
                                    onClick={() => handleSave(h)}
                                    disabled={savedIds.has(h.id)}
                                    className={`flex-1 px-4 py-2 rounded-lg border font-medium text-sm transition-colors flex items-center justify-center gap-2 ${savedIds.has(h.id)
                                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                        : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--secondary)]'
                                        }`}
                                >
                                    <Save className="w-4 h-4" />
                                    {savedIds.has(h.id) ? 'Saved' : 'Save'}
                                </button>
                                <a
                                    href={h.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white hover:bg-blue-600 transition-colors flex items-center justify-center"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    </motion.div>
                ))}

                {isLoading && (
                    <div className="col-span-full py-10 flex flex-col items-center justify-center text-[var(--muted)] animate-pulse">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p>Scouting for more hackathons...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
