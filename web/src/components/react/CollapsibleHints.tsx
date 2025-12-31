import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

interface Props {
    hints: string[];
}

export default function CollapsibleHints({ hints }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    if (!hints || hints.length === 0) return null;

    return (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-700/30 mb-8 mt-8 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 text-left focus:outline-none hover:bg-yellow-100/50 dark:hover:bg-yellow-900/30 transition-colors"
            >
                <div className="flex items-center gap-2 font-bold text-yellow-800 dark:text-yellow-200">
                    <Lightbulb size={20} />
                    <span>Need a hint?</span>
                </div>
                {isOpen ? (
                    <ChevronUp size={20} className="text-yellow-800 dark:text-yellow-200" />
                ) : (
                    <ChevronDown size={20} className="text-yellow-800 dark:text-yellow-200" />
                )}
            </button>

            {isOpen && (
                <div className="px-6 pb-6 pt-6 animate-in slide-in-from-top-2 duration-200">
                    <ul className="list-disc list-inside space-y-2 text-yellow-900 dark:text-yellow-100">
                        {hints.map((hint, index) => (
                            <li key={index}>{hint}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
