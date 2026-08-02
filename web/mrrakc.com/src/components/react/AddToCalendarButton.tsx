import { CalendarPlus } from 'lucide-react';
import { googleCalendarUrl, type CalItem } from '../../utils/calendar';

interface Props {
    item: CalItem;
    /** Extra classes for the link. */
    className?: string;
}

/**
 * Save a single event to Google Calendar — a prefilled, all-day "create event"
 * link (the dataset carries no times). Pure client-side; opens in a new tab.
 */
export default function AddToCalendarButton({ item, className = '' }: Props) {
    return (
        <a
            href={googleCalendarUrl(item)}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border border-clay/20 dark:border-charcoal-light bg-white dark:bg-charcoal text-charcoal dark:text-stone-200 hover:border-terra/50 transition-colors ${className}`}
        >
            <CalendarPlus size={16} className="text-terra" />
            Add to calendar
        </a>
    );
}
