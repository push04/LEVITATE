'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ExternalLink, RefreshCw, Briefcase, Filter, Loader2, Globe } from 'lucide-react';

interface JobPost {
    id: string;
    title: string;
    description: string;
    link: string;
    pubDate: string;
    source: 'Upwork' | 'Freelancer' | 'WeWorkRemotely' | 'RemoteOK';
}

import AddToCampaignModal from '@/components/admin/growth/AddToCampaignModal';

export default function ScoutPage() {
    const [query, setQuery] = useState('react developer');
    const [jobs, setJobs] = useState<JobPost[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filterSource, setFilterSource] = useState<string>('all');
    const [selectedLead, setSelectedLead] = useState<{ name: string, source: string, source_id: string } | null>(null);

    const fetchJobs = async () => {
        setIsLoading(true);
        setError(null);
        setJobs([]); // Clear previous
        try {
            const res = await fetch(`/api/admin/growth/scout?q=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
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
                        const newJobs = JSON.parse(line);
                        if (newJobs.error) {
                            console.error('Stream error:', newJobs.error);
                            setError(newJobs.error);
                        } else if (Array.isArray(newJobs)) {
                            setJobs(prev => {
                                const existingIds = new Set(prev.map(j => j.id));
                                const uniqueNew = newJobs.filter(j => !existingIds.has(j.id));
                                return [...prev, ...uniqueNew];
                            });
                        }
                    } catch (e) {
                        console.error('JSON parse error', e);
                    }
                }
            }
        } catch (error: any) {
            console.error('Failed to fetch jobs', error);
            setError(error.message || 'Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchJobs();
    };

    const filteredJobs = jobs.filter(job => filterSource === 'all' || job.source === filterSource);

    const getSourceColor = (source: string) => {
        switch (source) {
            case 'Upwork': return 'text-[#14a800] bg-[#14a800]/10';
            case 'Freelancer': return 'text-[#29b2fe] bg-[#29b2fe]/10';
            case 'WeWorkRemotely': return 'text-[#e63c33] bg-[#e63c33]/10';
            case 'RemoteOK': return 'text-[#ff4742] bg-[#ff4742]/10';
            case 'Guru': return 'text-[#008f86] bg-[#008f86]/10';
            case 'PeoplePerHour': return 'text-[#ff7300] bg-[#ff7300]/10';
            case 'Remotive': return 'text-[#5e9ca0] bg-[#5e9ca0]/10';
            case 'WorkingNomads': return 'text-[#00a8cc] bg-[#00a8cc]/10';
            case 'Jobspresso': return 'text-[#cc0000] bg-[#cc0000]/10';
            case 'DailyRemote': return 'text-[#333333] bg-[#333333]/10 dark:text-white dark:bg-white/10';
            default: return 'text-[var(--primary)] bg-[var(--primary)]/10';
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Briefcase className="w-8 h-8 text-[var(--primary)]" />
                        Freelance Scout
                    </h1>
                    <p className="text-[var(--muted)] mt-1">
                        Aggregate live job postings from major platforms in real-time.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchJobs}
                        disabled={isLoading}
                        className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="glass-card p-4 flex flex-col md:flex-row gap-4">
                <form onSubmit={handleSearch} className="flex-shrink-0 w-full md:w-[400px] flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search jobs..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2 bg-[var(--primary)] text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
                    >
                        Search
                    </button>
                </form>

                <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                    <Filter className="w-4 h-4 text-[var(--muted)] shrink-0" />
                    {['all', 'Upwork', 'Freelancer', 'WeWorkRemotely', 'RemoteOK', 'Guru', 'PeoplePerHour', 'Remotive', 'WorkingNomads', 'Jobspresso', 'DailyRemote'].map(src => (
                        <button
                            key={src}
                            onClick={() => setFilterSource(src)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterSource === src
                                ? 'bg-[var(--foreground)] text-[var(--background)]'
                                : 'bg-[var(--secondary)] text-[var(--muted)] hover:text-[var(--foreground)]'
                                }`}
                        >
                            {src === 'all' ? 'All Sources' : src}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results */}
            <div className="grid gap-4">
                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3 animate-in slide-in-from-top-2">
                        <div className="w-5 h-5 shrink-0">⚠️</div>
                        <p className="font-medium text-sm">{error}</p>
                    </div>
                )}
                {isLoading ? (
                    <div className="py-20 text-center">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-[var(--primary)]" />
                        <p className="text-[var(--muted)]">Scouting the web for opportunities...</p>
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="py-20 text-center glass-card">
                        <Globe className="w-12 h-12 mx-auto mb-4 text-[var(--muted)] opacity-50" />
                        <h3 className="text-lg font-bold mb-1">No jobs found</h3>
                        <p className="text-[var(--muted)]">Try adjusting your search terms.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredJobs.map((job) => (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card p-6 flex flex-col h-full hover:border-[var(--primary)]/50 transition-colors group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getSourceColor(job.source)}`}>
                                        {job.source}
                                    </span>
                                    <span className="text-xs text-[var(--muted)]">
                                        {new Date(job.pubDate).toLocaleDateString()}
                                    </span>
                                </div>

                                <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
                                    {job.title}
                                </h3>

                                <div
                                    className="text-sm text-[var(--muted)] line-clamp-3 mb-6 flex-1 prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: job.description.replace(/<img[^>]*>/g, "") }}
                                />

                                <div className="mt-auto w-full flex gap-2">
                                    <button
                                        onClick={() => setSelectedLead({ name: 'Role: ' + job.title, source: job.source, source_id: job.id })}
                                        className="flex-1 px-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors font-medium text-sm"
                                    >
                                        Add to Campaign
                                    </button>
                                    <a
                                        href={job.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white hover:bg-blue-600 transition-all font-medium text-sm"
                                    >
                                        Apply <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <AddToCampaignModal
                isOpen={!!selectedLead}
                onClose={() => setSelectedLead(null)}
                leadData={selectedLead}
            />
        </div>
    );
}
