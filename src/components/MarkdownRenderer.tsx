import React from 'react';

import DOMPurify from 'isomorphic-dompurify';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    if (!content) return null;

    // Split by newlines to handle blocks
    // This is a simple parser to handle specific markdown syntax requested by the user:
    // **bold**, headers (<h3>, <h4> handled by HTML/string, but we can enhance), lists

    const processInlineStyles = (text: string) => {
        let processed = text;
        // Bold: **text** -> <strong>text</strong>
        processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Headers: ### Text -> <h3>Text</h3> (Simple line-based)
        processed = processed.replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mt-6 mb-3">$1</h3>');
        processed = processed.replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>');

        // Lists: - Item -> <li>Item</li> (Very basic, ideally needs wrapping <ul> but for mixed content this helps)
        processed = processed.replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>');

        return processed;
    };

    // If the content is purely HTML mixed with markdown, we can try to sanitize/parse it.
    // Given the current data structure uses HTML tags (<h2>, <p>), we mainly need to fix the inline markdown.

    const processedContent = DOMPurify.sanitize(processInlineStyles(content));

    return (
        <div
            className={`prose prose-lg dark:prose-invert max-w-none space-y-8
                prose-headings:font-heading prose-headings:font-bold prose-headings:text-[var(--foreground)]
                prose-h1:text-5xl prose-h1:mb-12
                prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-8 prose-h2:border-b prose-h2:border-[var(--border)] prose-h2:pb-4
                prose-h3:text-2xl prose-h3:mt-12 prose-h3:mb-6
                
                prose-p:text-[var(--paragraph)] prose-p:text-lg prose-p:leading-[2.2] prose-p:mb-8 prose-p:tracking-wide
                
                prose-li:text-[var(--paragraph)] prose-li:text-lg prose-li:leading-[1.8] prose-li:mb-4
                prose-ul:list-none prose-ul:pl-0 prose-ul:my-10 prose-ul:space-y-4
                
                prose-strong:text-[var(--foreground)] prose-strong:font-extrabold
                
                [&_li]:relative [&_li]:pl-8 [&_li]:before:content-["•"] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:text-[var(--primary)] [&_li]:before:font-bold
                
                ${className}`}
            dangerouslySetInnerHTML={{ __html: processedContent }}
        />
    );
}
