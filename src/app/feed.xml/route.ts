
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
    const supabase = getServiceSupabase();

    // Fetch latest 50 posts
    const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    const baseUrl = 'https://levitatelabs.online';

    const items = (posts || []).map((post) => {
        return `
        <item>
            <title><![CDATA[${post.title}]]></title>
            <link>${baseUrl}/blog/${post.slug}</link>
            <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
            <pubDate>${new Date(post.created_at).toUTCString()}</pubDate>
            <description><![CDATA[${post.excerpt || post.content.substring(0, 200)}]]></description>
            <content:encoded><![CDATA[${post.content}]]></content:encoded>
            <author>contact@levitatelabs.online (Levitate Team)</author>
            <category><![CDATA[${post.category}]]></category>
        </item>
        `;
    }).join('');

    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
    <title>Levitate Labs Blog</title>
    <link>${baseUrl}</link>
    <description>Latest tech insights and digital trends.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
</channel>
</rss>`;

    return new Response(rss, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
        },
    });
}
