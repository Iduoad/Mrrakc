import { useEffect } from 'react';
import { X, MapPin, Ticket, CalendarDays, Moon, Leaf, HelpCircle, CalendarClock } from 'lucide-react';
import type { AgendaEventDTO } from '../../types/agenda';
import { formatRecurrence, formatEditionDates, formatMonthsProse } from '../../utils/recurrence';
import { pickNextEdition } from '../../utils/calendar';
import AddToCalendarButton from './AddToCalendarButton';

interface Props {
    event: AgendaEventDTO | null;
    onClose: () => void;
}

export const TYPE_ICONS = {
    gregorian: CalendarDays,
    hijri: Moon,
    seasonal: Leaf,
    irregular: HelpCircle,
} as const;

export const TYPE_COLORS = {
    gregorian: 'text-terra',
    hijri: 'text-ocean',
    seasonal: 'text-green-700 dark:text-green-400',
    irregular: 'text-charcoal-light dark:text-stone-500',
} as const;

export default function EventModal({ event, onClose }: Props) {
    useEffect(() => {
        if (!event) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [event, onClose]);

    if (!event) return null;

    const TypeIcon = TYPE_ICONS[event.recurrence.type];
    const approximate = event.recurrence.type === 'hijri' || event.recurrence.type === 'seasonal';

    const next = pickNextEdition(event.futureEditions, new Date());
    const upcoming = next ? (formatEditionDates(next.startDate, next.endDate) ?? String(next.year)) : undefined;
    const calItem = next
        ? {
            id: event.id,
            name: event.name,
            provinces: event.provinces.map(p => p.name),
            year: next.year,
            edition: next.edition,
            startDate: next.startDate,
            endDate: next.endDate,
        }
        : null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-charcoal w-full max-w-lg rounded-2xl shadow-2xl border border-clay/20 dark:border-charcoal-light overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-4 border-b border-clay/10 dark:border-charcoal-light/10 flex items-center justify-between bg-clay/5 dark:bg-charcoal-light/5">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-terra/10 text-terra-dark dark:text-terra rounded-md">
                            {event.kind.split('/').join(': ').replace(/-/g, ' ')}
                        </span>
                        {event.status !== 'active' && (
                            <span className="px-2 py-1 text-xs font-bold rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 capitalize">
                                {event.status}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-clay/10 dark:hover:bg-charcoal-light/10 text-charcoal-light transition-colors"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <h3 className="text-2xl font-serif font-bold text-charcoal dark:text-stone-100 mb-3">
                        {event.name}
                    </h3>

                    <div className="space-y-2 mb-4">
                        <p className="flex items-center gap-2 text-sm text-charcoal dark:text-stone-200">
                            <MapPin size={14} className="text-terra shrink-0" />
                            {event.provinces.map(p => p.name).join(' · ')}
                        </p>
                        <p className="flex items-center gap-2 text-sm text-charcoal dark:text-stone-200">
                            <TypeIcon size={14} className={`shrink-0 ${TYPE_COLORS[event.recurrence.type]}`} />
                            {formatRecurrence(event.recurrence, event.placement?.months)}
                        </p>
                        {approximate && (
                            <p className="text-xs text-charcoal-light dark:text-stone-500 pl-6">
                                ≈ shown under an approximate Gregorian month
                            </p>
                        )}
                        {event.otherMonths && event.otherMonths.length > 0 && (
                            <p className="text-xs text-charcoal-light dark:text-stone-500 pl-6">
                                Past editions have also fallen in {formatMonthsProse(event.otherMonths)}.
                            </p>
                        )}
                        {upcoming && (
                            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                <CalendarClock size={14} className="shrink-0" />
                                Next edition: {upcoming}
                            </p>
                        )}
                        {event.admission && (
                            <p className="flex items-center gap-2 text-sm text-charcoal dark:text-stone-200">
                                <Ticket size={14} className="text-terra shrink-0" />
                                {event.admission}
                            </p>
                        )}
                    </div>

                    <p className="text-sm text-charcoal-light dark:text-stone-400 mb-4">
                        {event.excerpt}
                    </p>

                    {event.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {event.tags.map(tag => (
                                <span key={tag} className="px-2 py-1 text-xs text-charcoal-light bg-clay/20 dark:text-stone-300 dark:bg-charcoal-light/30 rounded-full">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-clay/10 dark:border-charcoal-light/10 flex flex-wrap justify-end items-center gap-3 bg-clay/5 dark:bg-charcoal-light/5">
                    {calItem && <AddToCalendarButton item={calItem} />}
                    <a
                        href={`/agenda/${event.id}`}
                        className="px-6 py-2 bg-terra text-white text-sm font-bold rounded-xl hover:bg-terra-dark transition-colors shadow-md hover:shadow-lg"
                    >
                        View details
                    </a>
                </div>
            </div>
        </div>
    );
}
