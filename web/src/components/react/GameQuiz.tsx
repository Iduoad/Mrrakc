import React, { useState } from 'react';
import { ArrowRight, HelpCircle, MessageSquare } from 'lucide-react';
import CollapsibleHints from './CollapsibleHints';

interface Props {
    correctAnswer: string;
    nextStepSlug: string;
    hints?: string[];
    question: string;
}

export default function GameQuiz({ correctAnswer, nextStepSlug, hints, question }: Props) {
    const [answer, setAnswer] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (answer.toLowerCase().trim().replace(/\s+/g, '-') === correctAnswer.toLowerCase()) {
            // Navigate to the next step relative to the current game root
            const currentPath = window.location.pathname;
            // Remove trailing slash if present
            const cleanPath = currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath;
            // Get the parent path (game root)
            const parentPath = cleanPath.substring(0, cleanPath.lastIndexOf('/'));

            window.location.href = `${parentPath}/${nextStepSlug}`;
        } else {
            setError('Incorrect answer. Try again!');
        }
    };

    return (
        <div className="not-prose bg-white dark:bg-charcoal-light/10 p-6 rounded-2xl border border-clay/20 dark:border-charcoal-light shadow-sm mt-8">
            <div className="mb-6 flex items-center gap-3">
                <HelpCircle className="text-terra shrink-0" size={24} />
                <h3 className="font-serif font-bold text-xl text-charcoal dark:text-stone-100">{question}</h3>
            </div>

            {hints && hints.length > 0 && (
                <div className="mb-6">
                    <CollapsibleHints hints={hints} />
                </div>
            )}

            <div className="mb-4 flex items-center gap-3">
                <MessageSquare className="text-terra shrink-0" size={24} />
                <h3 className="font-serif font-bold text-xl text-charcoal dark:text-stone-100">Your Answer</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <input
                        type="text"
                        value={answer}
                        onChange={(e) => {
                            setAnswer(e.target.value);
                            setError('');
                        }}
                        placeholder="Type your answer here..."
                        className="w-full px-4 py-3 rounded-xl bg-clay/10 dark:bg-charcoal border border-clay/20 dark:border-charcoal-light focus:outline-none focus:ring-2 focus:ring-terra/50 text-charcoal dark:text-stone-100 placeholder-charcoal-light/50"
                    />
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                <button
                    type="submit"
                    className="w-full py-3 bg-terra text-white font-bold rounded-xl hover:bg-terra-dark transition-colors flex items-center justify-center gap-2"
                >
                    Submit Answer <ArrowRight size={18} />
                </button>
            </form>
            <p className="text-xs text-charcoal-light/70 dark:text-stone-400 mt-4 text-center">
                Answers should be in lowercase letters. Replace whitespace with hyphens. e.g <code>moretti-milone</code>, <code>1930</code>, <code>16th-november-square</code>
            </p>
        </div>
    );
}
