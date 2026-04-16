import React from 'react';

interface Props {
    content: string;
    className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: Props) {
    if (!content) return null;

    // 1. Split by references to create blocks (paragraphs)
    const blocks = content.split(/\n\n+/);

    return (
        <div className={`space-y-4 ${className}`}>
            {blocks.map((block, index) => {
                // Check for list
                if (block.trim().startsWith('- ')) {
                    const items = block.split('\n').filter(line => line.trim().startsWith('- '));
                    return (
                        <ul key={index} className="list-disc pl-5 space-y-1">
                            {items.map((item, i) => (
                                <li key={i}>{parseInline(item.replace(/^- /, ''))}</li>
                            ))}
                        </ul>
                    );
                }

                return <p key={index} className="leading-relaxed">{parseInline(block)}</p>;
            })}
        </div>
    );
}

function parseInline(text: string): React.ReactNode[] {
    // Simple parser for **bold**, *italic*, [link](url)
    // We'll use a regex split approach

    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining) {
        // Find next marker: ** or [
        // This is a naive greedy parser, but sufficient for simple descriptions
        const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
        const linkMatch = remaining.match(/\[(.*?)\]\((.*?)\)/);

        // Find standard links http...
        // We prioritize explicit markdown links

        let nearestIndex = Infinity;
        let type = '';
        let match = null;

        if (boldMatch && boldMatch.index !== undefined && boldMatch.index < nearestIndex) {
            nearestIndex = boldMatch.index;
            type = 'bold';
            match = boldMatch;
        }

        if (linkMatch && linkMatch.index !== undefined && linkMatch.index < nearestIndex) {
            nearestIndex = linkMatch.index;
            type = 'link';
            match = linkMatch;
        }

        if (type && match) {
            // Push text before match
            if (nearestIndex > 0) {
                parts.push(<span key={key++}>{remaining.substring(0, nearestIndex)}</span>);
            }

            if (type === 'bold') {
                parts.push(<strong key={key++} className="font-bold text-charcoal dark:text-stone-100">{match[1]}</strong>);
            } else if (type === 'link') {
                parts.push(
                    <a
                        key={key++}
                        href={match[2]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-terra hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {match[1]}
                    </a>
                );
            }

            remaining = remaining.substring(nearestIndex + match[0].length);
        } else {
            // No more matches
            parts.push(<span key={key++}>{remaining}</span>);
            remaining = '';
        }
    }

    return parts;
}
