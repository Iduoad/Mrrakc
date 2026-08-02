import { X, CalendarClock } from 'lucide-react';
import { TYPE_ICONS, TYPE_COLORS } from './EventModal';
import type { RecurrenceType } from '../../utils/recurrence';

interface Props {
    isOpen: boolean;
    onClose: () => void;

    availableKinds: string[];
    availableProvinces: string[];
    availableTypes: RecurrenceType[];
    provinceLabels: Record<string, string>;
    hasUpcoming: boolean;
    upcomingCount: number;

    selectedKinds: string[];
    selectedProvinces: string[];
    selectedTypes: string[];
    upcomingOnly: boolean;

    onKindChange: (kind: string) => void;
    onProvinceChange: (province: string) => void;
    onTypeChange: (type: string) => void;
    onUpcomingChange: () => void;
    onClearFilters: () => void;
}

export default function AgendaFilters({
    isOpen,
    onClose,
    availableKinds,
    availableProvinces,
    availableTypes,
    provinceLabels,
    hasUpcoming,
    upcomingCount,
    selectedKinds,
    selectedProvinces,
    selectedTypes,
    upcomingOnly,
    onKindChange,
    onProvinceChange,
    onTypeChange,
    onUpcomingChange,
    onClearFilters,
}: Props) {
    if (!isOpen) return null;

    const hasActiveFilters = selectedKinds.length > 0 ||
        selectedProvinces.length > 0 ||
        selectedTypes.length > 0 ||
        upcomingOnly;

    const chipClass = (selected: boolean) =>
        `px-3 py-1 text-xs rounded-full border transition-all duration-200 ${selected
            ? 'bg-terra text-white border-terra'
            : 'bg-white dark:bg-charcoal text-charcoal dark:text-stone-300 border-clay/20 dark:border-charcoal-light hover:border-terra/50'
        }`;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-charcoal w-full max-w-lg rounded-2xl shadow-2xl border border-clay/20 dark:border-charcoal-light overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-4 border-b border-clay/10 dark:border-charcoal-light/10 flex items-center justify-between bg-clay/5 dark:bg-charcoal-light/5">
                    <h3 className="font-serif font-bold text-lg text-charcoal dark:text-stone-100">Filter Events</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-clay/10 dark:hover:bg-charcoal-light/10 text-charcoal-light transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {hasUpcoming && (
                        <div className="mb-6">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-light dark:text-stone-500 mb-2">Upcoming</h4>
                            <button
                                onClick={onUpcomingChange}
                                aria-pressed={upcomingOnly}
                                className={`inline-flex items-center gap-1.5 ${chipClass(upcomingOnly)}`}
                            >
                                <CalendarClock size={12} className={upcomingOnly ? '' : 'text-emerald-600 dark:text-emerald-400'} />
                                <span>Upcoming editions only</span>
                                <span className={`text-[10px] font-bold rounded-full px-1.5 ${upcomingOnly ? 'bg-white/25' : 'bg-clay/20 dark:bg-charcoal-light/40'}`}>
                                    {upcomingCount}
                                </span>
                            </button>
                        </div>
                    )}

                    <div className="mb-6">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-light dark:text-stone-500 mb-2">Kind</h4>
                        <div className="flex flex-wrap gap-2">
                            {availableKinds.map(kind => (
                                <button
                                    key={kind}
                                    onClick={() => onKindChange(kind)}
                                    className={chipClass(selectedKinds.includes(kind))}
                                >
                                    {kind.replace('/', ': ').replace(/-/g, ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-light dark:text-stone-500 mb-2">Province</h4>
                        <div className="flex flex-wrap gap-2">
                            {availableProvinces.map(province => (
                                <button
                                    key={province}
                                    onClick={() => onProvinceChange(province)}
                                    className={chipClass(selectedProvinces.includes(province))}
                                >
                                    {provinceLabels[province] ?? province}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-light dark:text-stone-500 mb-2">Calendar Type</h4>
                        <div className="flex flex-wrap gap-2">
                            {availableTypes.map(type => {
                                const TypeIcon = TYPE_ICONS[type];
                                const selected = selectedTypes.includes(type);
                                return (
                                    <button
                                        key={type}
                                        onClick={() => onTypeChange(type)}
                                        className={`inline-flex items-center gap-1.5 ${chipClass(selected)}`}
                                    >
                                        <TypeIcon size={12} className={selected ? '' : TYPE_COLORS[type]} />
                                        <span className="capitalize">{type}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
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
