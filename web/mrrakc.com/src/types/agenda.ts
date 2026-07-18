import type { Recurrence } from '../utils/recurrence';

export interface AgendaEventDTO {
    id: string;
    name: string;
    kind: string;
    tags: string[];
    status: 'active' | 'discontinued' | 'unknown';
    /** Host province(s); first entry is the primary host. */
    provinces: { slug: string; name: string }[];
    recurrence: Recurrence;
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
