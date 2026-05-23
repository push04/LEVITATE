import { useState } from 'react';
import { Sparkles, Save, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';

export default function BlogManager() {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [content, setContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);

    const handleGenerateAI = async () => {
        if (!title) return alert('Please enter a title for context.');

        setIsGenerating(true);
        try {
            const res = await fetch('/api/admin/blog/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: title, category })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // AI now returns { title, content }
            if (data.content) {
                setContent(data.content);
            }
            if (data.title) {
                setTitle(data.title); // Overwrite existing title with AI-generated one
            }
        } catch (error: any) {
            console.error('Failed to generate blog content', error);
            setNotification({ type: 'error', message: `Failed to generate content: ${error.message}` });
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (!title || !content || !category) {
            setNotification({ type: 'error', message: 'Please fill in all fields.' });
            return;
        }

        setIsSaving(true);
        setNotification(null);

        try {
            // Generate basic slug if new, or keep existing/update if editing
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            const url = editingId ? '/api/admin/blog/update' : '/api/admin/blog/publish';
            const method = editingId ? 'PUT' : 'POST';

            const payload: any = {
                title,
                slug,
                category,
                content,
                excerpt: content.substring(0, 150) + '...',
                cover_image: '/blog/default.jpg',
                read_time: `${Math.ceil(content.split(' ').length / 200)} min read`,
                published: true
            };

            if (editingId) {
                payload.id = editingId;
            }

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to save');
            }

            setNotification({ type: 'success', message: editingId ? 'Post updated successfully!' : 'Post published successfully!' });

            // Reset form
            setTitle('');
            setContent('');
            setCategory('');
            setEditingId(null);
            fetchPosts(); // Refresh list
        } catch (error: any) {
            console.error('Error saving post:', error);
            setNotification({ type: 'error', message: `Failed to save: ${error.message}` });
        } finally {
            setIsSaving(false);
        }
    };

    // List State
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);

    // Fetch posts on mount
    useState(() => {
        fetchPosts();
    });

    async function fetchPosts() {
        setIsLoadingPosts(true);
        try {
            const res = await fetch('/api/admin/blog/list');
            const data = await res.json();
            if (data.success && data.posts) {
                setPosts(data.posts);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoadingPosts(false); }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        try {
            const res = await fetch(`/api/admin/blog/delete?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setNotification({ type: 'success', message: 'Post deleted.' });
                fetchPosts(); // Reload
            } else {
                alert('Failed to delete');
            }
        } catch (e) { alert('Error deleting'); }
    };

    const handleEdit = (post: any) => {
        setTitle(post.title);
        setCategory(post.category);
        setContent(post.content);
        setEditingId(post.id);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setTitle('');
        setCategory('');
        setContent('');
        setEditingId(null);
    };

    return (
        <div className="space-y-12">
            {/* Editor Section */}
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">{editingId ? 'Edit Post' : 'Write New Post'}</h2>
                    <div className="flex gap-2">
                        {editingId && (
                            <button
                                onClick={handleCancelEdit}
                                className="px-4 py-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={handleGenerateAI}
                            disabled={isGenerating}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                            {isGenerating ? 'Writing...' : 'Auto-Write'}
                        </button>
                        <button
                            onClick={handlePublish}
                            disabled={isSaving}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saving...' : (editingId ? 'Update Post' : 'Publish')}
                        </button>
                    </div>
                </div>

                {/* Notification */}
                {notification && (
                    <div className={`p-4 rounded-xl flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {notification.message}
                    </div>
                )}

                <div className="grid gap-6 p-6 glass-card rounded-xl">
                    {/* Inputs for Title, Category, Content ... */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Post Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-[var(--primary)] outline-none"
                            placeholder="e.g., The Future of Web Development"
                        />
                    </div>
                    {/* ... (rest of form) ... */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] outline-none"
                            >
                                <option value="">Select Category</option>
                                <option value="Web Development">Web Development</option>
                                <option value="Tech Trends">Tech Trends</option>
                                <option value="Business Strategy">Business Strategy</option>
                                <option value="Engineering & Design">Engineering & Design</option>
                                <option value="Levitate Services">Levitate Services</option>
                                <option value="Artificial Intelligence & Agents">Artificial Intelligence & Agents</option>
                                <option value="Advanced Robotics & Automation">Advanced Robotics & Automation</option>
                                <option value="Mechanical Engineering & Manufacturing">Mechanical Engineering & Manufacturing</option>
                                <option value="Sustainable Energy & Green Tech">Sustainable Energy & Green Tech</option>
                                <option value="Space Exploration & Aerospace">Space Exploration & Aerospace</option>
                                <option value="WebAssembly & Edge Computing">WebAssembly & Edge Computing</option>
                                <option value="Biotechnology & MedTech">Biotechnology & MedTech</option>
                                <option value="Quantum Computing">Quantum Computing</option>
                                <option value="Cybersecurity & Privacy">Cybersecurity & Privacy</option>
                                <option value="Electric Vehicles & Battery Tech">Electric Vehicles & Battery Tech</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Cover Image URL</label>
                            <input
                                type="text"
                                className="w-full p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] outline-none"
                                placeholder="/blog/default.jpg"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Content (Html Supported)</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={15}
                            className="w-full p-4 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-[var(--primary)] outline-none font-mono text-sm leading-relaxed"
                            placeholder="Write content..."
                        />
                    </div>
                </div>
            </div>

            {/* Management Section */}
            <div className="border-t border-[var(--border)] pt-12">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Manage Posts</h2>
                    <button onClick={fetchPosts} className="text-sm text-[var(--primary)] hover:underline">
                        Refresh List
                    </button>
                </div>

                <div className="glass-card rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--secondary)]/50 border-b border-[var(--border)]">
                                <th className="p-4 font-bold">Title</th>
                                <th className="p-4 font-bold">Category</th>
                                <th className="p-4 font-bold">Date</th>
                                <th className="p-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {posts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-[var(--muted)]">
                                        {isLoadingPosts ? 'Loading posts...' : 'No posts found.'}
                                    </td>
                                </tr>
                            ) : (
                                posts.map((post) => (
                                    <tr key={post.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                                        <td className="p-4 font-medium">{post.title}</td>
                                        <td className="p-4 text-sm text-[var(--muted)]">{post.category}</td>
                                        <td className="p-4 text-sm text-[var(--muted)]">
                                            {new Date(post.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(post)}
                                                    className="text-[var(--primary)] hover:text-[var(--primary)]/80 text-sm font-bold px-3 py-1 rounded-lg hover:bg-[var(--primary)]/10 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(post.id)}
                                                    className="text-red-500 hover:text-red-600 text-sm font-bold px-3 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
