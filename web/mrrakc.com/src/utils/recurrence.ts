export type RecurrenceType = 'gregorian' | 'hijri' | 'seasonal' | 'irregular';

export interface Recurrence {
    frequency: 'annual' | 'biennial' | 'irregular';
    type: RecurrenceType;
    typicalDurationDays?: number;
    note?: string;
    months?: number[];
    part?: 'early' | 'mid' | 'late' | 'first-half' | 'second-half' | 'full';
    hijriMonth?: number;
    hijriDay?: number;
    observance?: string;
    season?: 'spring' | 'summer' | 'autumn' | 'winter';
    urls?: { url: string; title?: string }[];
}

export const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export const HIJRI_MONTH_NAMES = [
    'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
    'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
    'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

export const SEASON_MONTHS: Record<string, number[]> = {
    spring: [3, 4, 5],
    summer: [6, 7, 8],
    autumn: [9, 10, 11],
    winter: [12, 1, 2],
};

const OBSERVANCE_LABELS: Record<string, string> = {
    'ramadan': 'Ramadan',
    'eid-al-fitr': 'Eid al-Fitr',
    'eid-al-adha': 'Eid al-Adha',
    'mawlid': 'Mawlid',
    'ashura': 'Ashura',
    'hijri-new-year': 'the Hijri New Year',
};

const PART_LABELS: Record<string, string> = {
    'early': 'early',
    'mid': 'mid',
    'late': 'late',
    'first-half': 'first half of',
    'second-half': 'second half of',
    'full': '',
};

const FREQUENCY_LABELS: Record<string, string> = {
    'annual': 'Annual',
    'biennial': 'Every two years',
    'irregular': 'Irregular',
};

export function formatRecurrence(rec: Recurrence): string {
    const freq = FREQUENCY_LABELS[rec.frequency] ?? rec.frequency;
    let anchor = '';

    switch (rec.type) {
        case 'gregorian': {
            const names = (rec.months ?? []).map(m => MONTH_NAMES[m - 1]);
            const range = names.length > 1 ? `${names[0]}–${names[names.length - 1]}` : (names[0] ?? '');
            const part = rec.part ? PART_LABELS[rec.part] : '';
            anchor = part ? `${part} ${range}` : range;
            break;
        }
        case 'hijri': {
            const month = HIJRI_MONTH_NAMES[(rec.hijriMonth ?? 1) - 1];
            anchor = rec.hijriDay ? `${rec.hijriDay} ${month}` : month;
            if (rec.observance && OBSERVANCE_LABELS[rec.observance]) {
                anchor += ` (around ${OBSERVANCE_LABELS[rec.observance]})`;
            }
            break;
        }
        case 'seasonal':
            anchor = rec.season ?? '';
            break;
        case 'irregular':
            anchor = 'no fixed dates';
            break;
    }

    const duration = rec.typicalDurationDays
        ? ` · ~${rec.typicalDurationDays} day${rec.typicalDurationDays > 1 ? 's' : ''}`
        : '';

    return anchor ? `${freq} · ${anchor}${duration}` : `${freq}${duration}`;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatPartialDate(date: string): string | undefined {
    const [, month, day] = date.split('-');
    if (!month) return undefined;
    const name = SHORT_MONTHS[parseInt(month, 10) - 1];
    return day ? `${name} ${parseInt(day, 10)}` : name;
}

export function formatEditionDates(start?: string, end?: string): string | undefined {
    const from = start ? formatPartialDate(start) : undefined;
    const to = end ? formatPartialDate(end) : undefined;
    if (from && to) return from === to ? from : `${from} – ${to}`;
    return from ?? to;
}

export function admissionSummary(options?: { modality: string }[]): string | undefined {
    if (!options || options.length === 0) return undefined;
    const modalities = new Set(options.map(o => o.modality));
    const free = modalities.has('free');
    const paid = modalities.has('ticket') || modalities.has('pass') || modalities.has('membership');
    if (free && paid) return 'Free + ticketed';
    if (free) return 'Free';
    if (paid) return 'Ticketed';
    const first = options[0].modality;
    return first.charAt(0).toUpperCase() + first.slice(1);
}
