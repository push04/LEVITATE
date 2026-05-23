import { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { GRID_BG_STYLE } from '@/lib/styles';
import { getServiceSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
    title: 'Blog & Resources | Levitate Labs',
    description: 'Insights on web development, CAD engineering, and startup growth strategies.',
};

export const revalidate = 60;

export default async function BlogIndexPage() {
    let posts: any[] = [];

    try {
        const supabase = getServiceSupabase();
        const { data } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
        posts = (data ?? []) as any[];
    } catch (error) {
        console.error('[Blog] Failed to load posts:', error);
        posts = [];
    }

    return (
        <section className="min-h-screen pt-24 pb-20 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={GRID_BG_STYLE} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold font-heading mb-6">
                        Insights & <span className="gradient-text">Resources</span>
                    </h1>
                    <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto">
                        Expert guides on building scalable web apps, manufacturing-ready CAD designs, and growth marketing strategies.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {(posts || []).map((post) => (
                        <article key={post.slug} className="glass-card hover:border-[var(--primary)]/50 transition-colors duration-300 flex flex-col h-full group">
                            <Link href={`/blog/${post.slug}`} className="flex flex-col h-full p-6">
                                <div className="mb-4">
                                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--secondary)] text-[var(--primary)] mb-4 inline-block">
                                        {post.category}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold mb-3 group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                                    {post.title}
                                </h2>
                                <p className="text-[var(--muted)] text-sm mb-6 line-clamp-3">
                                    {post.excerpt}
                                </p>

                                <div className="mt-auto flex items-center justify-between text-xs text-[var(--muted)] pt-4 border-t border-[var(--border)]">
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(post.created_at).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {post.read_time || '5 min read'}
                                        </span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform text-[var(--foreground)]" />
                                </div>
                            </Link>
                        </article>
                    ))}
                </div>

                {posts.length === 0 ? (
                    <div className="mt-14 text-center text-[var(--muted)]">
                        No posts are available right now.
                    </div>
                ) : null}
            </div>
        </section>
    );
}

