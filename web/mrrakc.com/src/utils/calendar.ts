// Client-side calendar helpers for the agenda.
//
// The site is a static SSG build with no server, so "add to calendar" and the
// "upcoming edition" cue are all generated in the browser. Events are all-day
// (the dataset carries no times), so we work purely with calendar dates.

const SITE = 'https://mrrakc.com';

/** A trimmed edition carried into the client DTO (dates only). */
export interface EditionLite {
    year: number;
    edition?: number;
    startDate?: string;
    endDate?: string;
}

/** The minimum an edition needs to become a calendar entry. */
export interface CalItem {
    id: string;
    name: string;
    provinces: string[];
    year: number;
    edition?: number;
    startDate: string;
    endDate?: string;
}

interface DateParts {
    y: number;
    m: number; // 1-12, or 0 when only the year is known
    d: number; // 1-31, or 0 when only year/month is known
}

/** Parse a `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` edition date. */
export function parseEditionDate(s?: string): DateParts | null {
    if (!s) return null;
    const [ys, ms, ds] = s.split('-');
    const y = parseInt(ys, 10);
    if (Number.isNaN(y)) return null;
    const m = ms ? parseInt(ms, 10) : 0;
    const d = ds ? parseInt(ds, 10) : 0;
    return { y, m: Number.isNaN(m) ? 0 : m, d: Number.isNaN(d) ? 0 : d };
}

/**
 * A concrete UTC date for an edition string. Requires at least `YYYY-MM`
 * precision (year-only editions can't be placed on a calendar → null).
 * For `YYYY-MM`, `endOfRange` picks the last day of the month, else the first.
 */
function toDate(s?: string, endOfRange = false): Date | null {
    const p = parseEditionDate(s);
    if (!p || !p.m) return null;
    const month = p.m - 1;
    if (p.d) return new Date(Date.UTC(p.y, month, p.d));
    return endOfRange
        ? new Date(Date.UTC(p.y, month + 1, 0)) // last day of month
        : new Date(Date.UTC(p.y, month, 1));
}

const DAY_MS = 86_400_000;

/** Midnight-UTC of a local date, for day-granularity comparisons. */
function startOfDayUTC(now: Date): number {
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/**
 * From a candidate list (already trimmed to still-open editions at build), pick
 * the soonest edition whose end date is on/after `now`. Falls back to the start
 * date when there is no end date. Returns null when none qualify (or all are
 * year-only). The result always has a usable `startDate`.
 */
export function pickNextEdition(
    editions: EditionLite[] | undefined,
    now: Date,
): (EditionLite & { startDate: string }) | null {
    if (!editions || editions.length === 0) return null;
    const today = startOfDayUTC(now);
    let best: EditionLite | null = null;
    let bestStart = Infinity;
    for (const e of editions) {
        const start = toDate(e.startDate, false);
        if (!start) continue; // needs >= YYYY-MM
        const end = toDate(e.endDate ?? e.startDate, true) ?? start;
        if (end.getTime() < today) continue; // already over
        if (start.getTime() < bestStart) {
            bestStart = start.getTime();
            best = e;
        }
    }
    return best ? { ...best, startDate: best.startDate! } : null;
}

/**
 * Build-time trim: from an event's full edition list, keep only the still-open
 * ones (held, ≥ `YYYY-MM` precision, end date on/after `now`). Editions already
 * over at build can never become the runtime "next" (runtime now ≥ build now),
 * so they are dropped to keep the client payload small. Dates only.
 */
export function stillOpenEditions(
    editions:
        | { year: number; edition?: number; startDate?: string; endDate?: string; status?: string }[]
        | undefined,
    now: Date,
): EditionLite[] {
    if (!editions) return [];
    const today = startOfDayUTC(now);
    const out: EditionLite[] = [];
    for (const e of editions) {
        if (e.status && e.status !== 'held') continue; // held only
        const start = toDate(e.startDate, false);
        if (!start) continue; // needs >= YYYY-MM
        const end = toDate(e.endDate ?? e.startDate, true) ?? start;
        if (end.getTime() < today) continue;
        out.push({ year: e.year, edition: e.edition, startDate: e.startDate, endDate: e.endDate });
    }
    return out;
}

/** An edition as it appears in the dataset, for build-time placement work. */
interface EditionRaw {
    year: number;
    edition?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
}

/** Editions that actually happened (or are still scheduled) and carry a usable date. */
function datedHeldEditions(editions: EditionRaw[] | undefined): EditionRaw[] {
    if (!editions) return [];
    return editions.filter(e => {
        if (e.status && e.status !== 'held') return false; // cancelled / postponed
        const p = parseEditionDate(e.startDate);
        return Boolean(p && p.m); // needs >= YYYY-MM
    });
}

/**
 * Every calendar month a single edition's run touches, in chronological order —
 * so `[0]` is always the start month. A run crossing December wraps into the
 * next year correctly. Returns `[]` when the start is not at least `YYYY-MM`.
 */
export function editionSpanMonths(startDate?: string, endDate?: string): number[] {
    const start = parseEditionDate(startDate);
    if (!start || !start.m) return [];
    const end = parseEditionDate(endDate);
    const endY = end && end.m ? end.y : start.y;
    const endM = end && end.m ? end.m : start.m;

    const months: number[] = [];
    let y = start.y;
    let m = start.m;
    // Guard against reversed or malformed ranges: a run never spans a full year.
    while ((y < endY || (y === endY && m <= endM)) && months.length < 12) {
        months.push(m);
        m += 1;
        if (m > 12) {
            m = 1;
            y += 1;
        }
    }
    return months.length ? months : [start.m];
}

/** Where an event sits on the month grid, and what that placement was derived from. */
export interface Placement {
    /** Months the event occupies; `[0]` is the start, the rest are continuations. */
    months: number[];
    /** Day-of-month the anchoring edition starts on, when known — used to order
     *  entries within a month. */
    startDay?: number;
    source: 'edition' | 'recurrence';
}

/**
 * Pick the months an event should occupy on the calendar grid.
 *
 * `recurrence.months` is the union of every month the event has *ever* used, so a
 * festival that drifted over the years shows up in all of them at once. The
 * chronologically latest held edition — which may well be an upcoming one — is a
 * far better answer: it collapses drift to the month the event actually uses now,
 * while still spanning two months when a single run genuinely crosses a boundary.
 *
 * Falls back to `recurrence.months` for events with no dated editions.
 */
export function derivePlacement(
    months: number[] | undefined,
    editions: EditionRaw[] | undefined,
): Placement {
    const dated = datedHeldEditions(editions);
    if (dated.length === 0) {
        return { months: months ?? [], source: 'recurrence' };
    }
    const latest = dated.reduce((a, b) => (a.startDate! > b.startDate! ? a : b));
    const span = editionSpanMonths(latest.startDate, latest.endDate);
    if (span.length === 0) {
        return { months: months ?? [], source: 'recurrence' };
    }
    const day = parseEditionDate(latest.startDate)?.d;
    return { months: span, startDay: day || undefined, source: 'edition' };
}

/**
 * A placement plus the months the event used in the past but no longer does, for
 * the "past editions have also fallen in…" note.
 *
 * Gregorian only: hijri events drift ~11 days a year, so a past edition's
 * Gregorian month actively misleads (they keep their computed `approxMonth`),
 * and seasonal / irregular events have no edition-driven month to begin with.
 */
export function gregorianPlacement(
    recurrence: { type: string; months?: number[] },
    editions: EditionRaw[] | undefined,
): { placement?: Placement; otherMonths?: number[] } {
    if (recurrence.type !== 'gregorian') return {};
    const placement = derivePlacement(recurrence.months, editions);
    const other = (recurrence.months ?? []).filter(m => !placement.months.includes(m));
    return { placement, otherMonths: other.length > 0 ? other : undefined };
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

/** A Date → `YYYYMMDD` (all-day date form, used for Google Calendar ranges). */
function toICSDate(d: Date): string {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** Inclusive start + exclusive end (all-day) for an item, or null if undatable. */
function itemRange(it: CalItem): { start: Date; dtEnd: Date } | null {
    const start = toDate(it.startDate, false);
    if (!start) return null;
    const endInclusive = toDate(it.endDate ?? it.startDate, true) ?? start;
    // DTEND / Google end is exclusive for all-day events.
    const dtEnd = new Date(endInclusive.getTime() + DAY_MS);
    return { start, dtEnd };
}

function locationOf(it: CalItem): string {
    return it.provinces.length ? `${it.provinces.join(', ')}, Morocco` : 'Morocco';
}

/** A Google Calendar "create event" URL for a single all-day item. */
export function googleCalendarUrl(it: CalItem): string {
    const range = itemRange(it);
    if (!range) return `${SITE}/agenda/${it.id}`;
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: it.name,
        dates: `${toICSDate(range.start)}/${toICSDate(range.dtEnd)}`,
        details: `More: ${SITE}/agenda/${it.id}`,
        location: locationOf(it),
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
