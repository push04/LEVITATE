import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Calendar, Clock, Share2 } from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ShareButton from '@/components/ShareButton';

interface Props {
    params: Promise<{ slug: string }>;
}

export const revalidate = 60; // Revalidate every minute

export async function generateStaticParams() {
    const { data: posts } = await supabase.from('posts').select('slug');
    return (posts || []).map((post) => ({
        slug: post.slug,
    }));
}

export async function generateMetadata({ params }: Props) {
    const { slug } = await params;
    const { data: post } = await supabase.from('posts').select('*').eq('slug', slug).single();

    if (!post) {
        return { title: 'Post Not Found | Levitate Labs' };
    }

    return {
        title: `${post.title} | Levitate Labs Blog`,
        description: post.excerpt,
    };
}

export default async function BlogPostPage({ params }: Props) {
    const { slug } = await params;

    // Fetch current post
    const { data: post } = await supabase.from('posts').select('*').eq('slug', slug).single();

    if (!post) {
        notFound();
    }

    // Fetch related/other posts (just 2 random or recent for now)
    const { data: relatedPosts } = await supabase
        .from('posts')
        .select('slug, title, excerpt')
        .neq('slug', slug)
        .limit(2);

    return (
        <article className="min-h-screen bg-[var(--background)]">
            {/* Hero Section */}
            <div className="relative h-[50vh] min-h-[400px] flex items-end justify-center pb-20 pt-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)]/0 via-[var(--background)]/50 to-[var(--background)] z-10" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

                {/* Clean Professional Gradient */}
                <div className="absolute inset-0 bg-gradient-to-tr from-gray-100 via-gray-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-black opacity-50" />

                <div className="relative z-20 max-w-4xl mx-auto px-6 text-center">
                    <div className="mb-6 flex justify-center gap-2">
                        <span className="px-4 py-1.5 rounded-full border border-[var(--primary)] text-[var(--primary)] text-sm font-bold tracking-wide uppercase bg-[var(--surface)]">
                            {post.category}
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold font-heading mb-8 leading-tight tracking-tight text-[var(--foreground)] drop-shadow-sm">
                        {post.title}
                    </h1>

                    <div className="flex items-center justify-center gap-6 text-[var(--muted)] text-sm md:text-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-xs">
                                L
                            </div>
                            <span className="font-medium text-[var(--foreground)]">Levitate Team</span>
                        </div>
                        <span className="hidden md:inline">•</span>
                        <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {post.read_time || '5 min read'}
                        </span>
                        <span className="hidden md:inline">•</span>
                        <span className="hidden md:inline">{new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-32 relative z-30 -mt-12">
                {/* Back Link Floating */}
                <div className="absolute top-0 -left-20 hidden xl:block">
                    <Link href="/blog" className="p-3 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all flex items-center justify-center group shadow-lg">
                        <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* Main Content Card - Fixed Mobile Padding */}
                <div className="glass-card p-6 md:p-12 mb-20 shadow-xl bg-[var(--surface)] border-[var(--border)]">
                    <MarkdownRenderer content={post.content} />
                </div>

                {/* Social Share & Tags - simplified for now */}
                <div className="flex justify-center pb-16">
                    <ShareButton
                        title={post.title}
                        text={post.excerpt || 'Check out this article from Levitate Labs'}
                    />
                </div>

                {/* Read Next */}
                <div className="border-t border-[var(--border)] pt-16">
                    <h3 className="text-3xl font-bold mb-10 text-center">Continue Reading</h3>
                    <div className="grid md:grid-cols-2 gap-8">
                        {(relatedPosts || []).map(p => (
                            <Link key={p.slug} href={`/blog/${p.slug}`} className="group block p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] transition-all hover:shadow-2xl hover:-translate-y-1">
                                <span className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-3 block">Related</span>
                                <h4 className="text-xl font-bold mb-4 group-hover:text-[var(--primary)] transition-colors">{p.title}</h4>
                                <p className="text-[var(--muted)] line-clamp-3 leading-relaxed">{p.excerpt}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </article>
    );
}
