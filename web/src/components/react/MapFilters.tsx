import React from 'react';
import { X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;

    // Available options
    availableCategories: string[];
    availableProvinces: string[];
    availableTimePeriods: string[];
    availablePeople: string[];

    // Selected filters
    selectedCategories: string[];
    selectedProvinces: string[];
    selectedTimePeriods: string[];
    selectedPeople: string[];

    // Handlers
    onCategoryChange: (category: string) => void;
    onProvinceChange: (province: string) => void;
    onTimePeriodChange: (period: string) => void;
    onPersonChange: (person: string) => void;
    onClearFilters: () => void;
}

export default function MapFilters({
    isOpen,
    onClose,
    availableCategories,
    availableProvinces,
    availableTimePeriods,
    availablePeople,
    selectedCategories,
    selectedProvinces,
    selectedTimePeriods,
    selectedPeople,
    onCategoryChange,
    onProvinceChange,
    onTimePeriodChange,
    onPersonChange,
    onClearFilters
}: Props) {
    if (!isOpen) return null;

    const hasActiveFilters = selectedCategories.length > 0 ||
        selectedProvinces.length > 0 ||
        selectedTimePeriods.length > 0 ||
        selectedPeople.length > 0;

    const formatLabel = (label: string) => {
        // Remove prefixes
        let formatted = label.replace('province/', '').replace('people/', '');

        // Replace slash with colon for categories
        formatted = formatted.replace('/', ': ');

        // Capitalize first letter of each word (optional, but looks better)
        // formatted = formatted.replace(/\b\w/g, l => l.toUpperCase());

        return formatted;
    };

    const FilterSection = ({ title, options, selected, onChange }: { title: string, options: string[], selected: string[], onChange: (val: string) => void }) => {
        if (options.length === 0) return null;
        return (
            <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-light dark:text-stone-500 mb-2">{title}</h4>
                <div className="flex flex-wrap gap-2">
                    {options.map(option => (
                        <button
                            key={option}
                            onClick={() => onChange(option)}
                            className={`px-3 py-1 text-xs rounded-full border transition-all duration-200 ${selected.includes(option)
                                ? 'bg-terra text-white border-terra'
                                : 'bg-white dark:bg-charcoal text-charcoal dark:text-stone-300 border-clay/20 dark:border-charcoal-light hover:border-terra/50'
                                }`}
                        >
                            {formatLabel(option)}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-charcoal w-full max-w-lg rounded-2xl shadow-2xl border border-clay/20 dark:border-charcoal-light overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-4 border-b border-clay/10 dark:border-charcoal-light/10 flex items-center justify-between bg-clay/5 dark:bg-charcoal-light/5">
                    <h3 className="font-serif font-bold text-lg text-charcoal dark:text-stone-100">Filter Locations</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-clay/10 dark:hover:bg-charcoal-light/10 text-charcoal-light transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <FilterSection
                        title="Provinces"
                        options={availableProvinces}
                        selected={selectedProvinces}
                        onChange={onProvinceChange}
                    />

                    <FilterSection
                        title="Categories"
                        options={availableCategories}
                        selected={selectedCategories}
                        onChange={onCategoryChange}
                    />

                    <FilterSection
                        title="People"
                        options={availablePeople}
                        selected={selectedPeople}
                        onChange={onPersonChange}
                    />

                    <FilterSection
                        title="Time Periods"
                        options={availableTimePeriods}
                        selected={selectedTimePeriods}
                        onChange={onTimePeriodChange}
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-clay/10 dark:border-charcoal-light/10 flex justify-between items-center bg-clay/5 dark:bg-charcoal-light/5">
                    <button
                        onClick={onClearFilters}
                        disabled={!hasActiveFilters}
                        className={`text-sm font-medium transition-colors ${hasActiveFilters
                            ? 'text-terra hover:underline'
                            : 'text-charcoal-light/50 cursor-not-allowed'
                            }`}
                    >
                        Clear all filters
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-terra text-white text-sm font-bold rounded-xl hover:bg-terra-dark transition-colors shadow-md hover:shadow-lg"
                    >
                        Show Results
                    </button>
                </div>
            </div>
        </div>
    );
}
