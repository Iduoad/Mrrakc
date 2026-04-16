import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
    categories: string[];
    selectedCategories: string[];
    onToggle: (category: string) => void;
    className?: string;
}

export default function MapCategoryChips({ categories, selectedCategories, onToggle, className = '' }: Props) {
    return (
        <div className={`flex overflow-x-auto gap-2 py-2 px-4 no-scrollbar items-center ${className}`}>
            {categories.map((category) => {
                const isSelected = selectedCategories.includes(category);
                const label = category.split('/').pop()?.replace('-', ' ') || category;

                return (
                    <button
                        key={category}
                        onClick={() => onToggle(category)}
                        className={`
                            whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 border
                            ${isSelected
                                ? 'bg-terra text-white border-terra shadow-md scale-105'
                                : 'bg-white dark:bg-charcoal text-charcoal-light dark:text-stone-400 border-clay/20 dark:border-charcoal-light hover:border-terra/50 hover:text-terra'
                            }
                        `}
                    >
                        {label}
                    </button>
                );
            })}
            <style dangerouslySetInnerHTML={{
                __html: `
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}} />
        </div>
    );
}
