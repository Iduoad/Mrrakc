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

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

/** A Date → `YYYYMMDD` (all-day VALUE=DATE form). */
export function toICSDate(d: Date): string {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function icsStamp(d: Date): string {
    return (
        `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
        `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
    );
}

// RFC 5545 text escaping.
function icsEscape(s: string): string {
    return s
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r?\n/g, '\\n');
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

/** Build a VCALENDAR with one all-day VEVENT per (datable) item. */
export function buildICS(items: CalItem[]): string {
    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Mrrakc//Agenda//EN',
        'CALSCALE:GREGORIAN',
    ];
    const stamp = icsStamp(new Date());
    for (const it of items) {
        const range = itemRange(it);
        if (!range) continue;
        lines.push(
            'BEGIN:VEVENT',
            `UID:${it.id}-${it.year}@mrrakc.com`,
            `DTSTAMP:${stamp}`,
            `DTSTART;VALUE=DATE:${toICSDate(range.start)}`,
            `DTEND;VALUE=DATE:${toICSDate(range.dtEnd)}`,
            `SUMMARY:${icsEscape(it.name)}`,
            `LOCATION:${icsEscape(locationOf(it))}`,
            `URL:${SITE}/agenda/${it.id}`,
            `DESCRIPTION:${icsEscape(`More: ${SITE}/agenda/${it.id}`)}`,
            'END:VEVENT',
        );
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
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

/** Trigger a client-side download of an .ics string. */
export function downloadICS(filename: string, ics: string): void {
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
