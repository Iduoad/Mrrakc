import { useEffect, useRef, useState } from 'react';
import { CalendarPlus, Download, ExternalLink } from 'lucide-react';
import { buildICS, downloadICS, googleCalendarUrl, type CalItem } from '../../utils/calendar';

interface Props {
    item: CalItem;
    /** Extra classes for the trigger button. */
    className?: string;
}

/**
 * Small dropdown to save a single event to a calendar. Pure client-side: opens
 * a prefilled Google Calendar event, or downloads a universal .ics (Apple,
 * Outlook, Proton, …). All-day, since the dataset carries no times.
 */
export default function AddToCalendarButton({ item, className = '' }: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const onICS = () => {
        downloadICS(`${item.id}-${item.year}.ics`, buildICS([item]));
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative inline-block">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border border-clay/20 dark:border-charcoal-light bg-white dark:bg-charcoal text-charcoal dark:text-stone-200 hover:border-terra/50 transition-colors ${className}`}
            >
                <CalendarPlus size={16} className="text-terra" />
                Add to calendar
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-clay/20 dark:border-charcoal-light bg-white dark:bg-charcoal shadow-xl overflow-hidden"
                >
                    <a
                        role="menuitem"
                        href={googleCalendarUrl(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-charcoal dark:text-stone-200 hover:bg-clay/10 dark:hover:bg-charcoal-light/10 transition-colors"
                    >
                        <ExternalLink size={15} className="text-terra shrink-0" />
                        Google Calendar
                    </a>
                    <button
                        role="menuitem"
                        type="button"
                        onClick={onICS}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-left text-charcoal dark:text-stone-200 hover:bg-clay/10 dark:hover:bg-charcoal-light/10 transition-colors border-t border-clay/10 dark:border-charcoal-light/10"
                    >
                        <Download size={15} className="text-terra shrink-0" />
                        <span>
                            Download .ics
                            <span className="block text-xs text-charcoal-light dark:text-stone-500">Apple, Outlook, …</span>
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
}
