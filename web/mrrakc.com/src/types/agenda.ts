import type { Recurrence } from '../utils/recurrence';
import type { EditionLite, Placement } from '../utils/calendar';

export interface AgendaEventDTO {
    id: string;
    name: string;
    kind: string;
    tags: string[];
    status: 'active' | 'discontinued' | 'unknown';
    /** Host province(s); first entry is the primary host. */
    provinces: { slug: string; name: string }[];
    recurrence: Recurrence;
    /** Still-open editions (held, end date ≥ build date), dates only. The
     *  browser computes the "next" one from these against the visitor's real
     *  date, so the upcoming cue never goes stale between deploys. */
    futureEditions?: EditionLite[];
    /** Grid placement, derived at build time from the latest held, dated edition
     *  (gregorian only). `months[0]` is the start month; any later entry is that
     *  same run continuing, not a second occurrence. */
    placement?: Placement;
    /** Months in `recurrence.months` the placement doesn't cover — past editions
     *  that fell elsewhere. Rendered as prose, never on the grid. */
    otherMonths?: number[];
    /** For hijri events: approximate Gregorian month (1-12) of the next
     *  occurrence, computed at build time from the build date. */
    approxMonth?: number;
    admission?: string;
    excerpt: string;
    /** Resolved at build time: venue place coordinates when the event has
     *  venues in the dataset, otherwise the centroid of the host province's
     *  places. */
    latitude?: number;
    longitude?: number;
    locationSource?: 'venue' | 'province';
}
